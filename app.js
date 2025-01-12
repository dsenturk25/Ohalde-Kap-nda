const express = require('express');
const path = require('path');
const app = express();
const favicon = require('serve-favicon');
const axios = require("axios")
const async = require("async");
const PORT = 3000;

// Set Pug as the view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views')); // Set the directory for Pug templates
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')));

app.post("/get-data", (req, res) => {
    /*
        {
            TabelaGId: '8fc796f3-6fe1-4747-a043-cd032ea0306d',
            UrunAd: 'Pancar',
            BirimTurId: 1,
            KategoriId: 6,
            EnDusukFiyat: 10,
            EnYuksekFiyat: 15,
            GuneAit: '2025-01-09T00:00:00',
            HalTurId: 2
        }
    */
    const baseUrl = "https://halfiyatlaripublicdata.ibb.gov.tr/";
    // /api/HalManager/getProductPricebyDay -> o günkü ürünlerin fiyatlarını listeler
    const url = baseUrl + "/api/HalManager/getProductPricebyDay";

    axios.post(url, {
        "item": {
          "Day": req.body.firstDate
        }
    })
        .then(firstDateResponse => {
            axios.post(url, {
                "item": {
                  "Day": req.body.secondDate
                }
            })
                .then(secondDateResponse => {

                    if (firstDateResponse.data.Results.length && secondDateResponse.data.Results.length) {
                        const resultArray = [];
                        const noChangeProducts = [];
                        async.timesSeries(firstDateResponse.data.Results.length, (i, next1) => {
                            eachElementFirstDate = firstDateResponse.data.Results[i];
                            async.timesSeries(secondDateResponse.data.Results.length, (j, next2) => {
                                eachElementSecondDate = secondDateResponse.data.Results[j];

                                if (eachElementFirstDate["UrunAd"].trim().toLowerCase() == eachElementSecondDate["UrunAd"].trim().toLowerCase()) {

                                    if (eachElementSecondDate["EnDusukFiyat"] - eachElementFirstDate["EnDusukFiyat"] != 0 || eachElementSecondDate["EnYuksekFiyat"] - eachElementFirstDate["EnYuksekFiyat"]) {
                                        const eachElementResultObject = {
                                            "name": eachElementFirstDate["UrunAd"],
                                            "min": `${eachElementFirstDate["EnDusukFiyat"]} -> ${eachElementSecondDate["EnDusukFiyat"]}`,
                                            "max": `${eachElementFirstDate["EnYuksekFiyat"]} -> ${eachElementSecondDate["EnYuksekFiyat"]}`,
                                            "minChange": eachElementSecondDate["EnDusukFiyat"] - eachElementFirstDate["EnDusukFiyat"],
                                            "maxChange": eachElementSecondDate["EnYuksekFiyat"] - eachElementFirstDate["EnYuksekFiyat"],
                                        }
                                        resultArray.push(eachElementResultObject);
                                        next1();
                                    } else {
                                        noChangeProducts.push(eachElementFirstDate["UrunAd"]);
                                        next1();
                                    }
                                } else {
                                    next2();
                                }
                            }, (err) => {
                                next1();
                            })
                        }, (err) => {
                            return res.status(200).json({ resultArray: resultArray, noChangeProducts: noChangeProducts });  
                        })
                    } else {
                        return res.status(200).json({ error: "Girilen tarihlerde veri mevcut değil!" });  
                    }
                })
        })
})

app.get('/', (req, res) => {
    res.render('index', { title: 'Ohalde Fiyat Bilgi' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
});