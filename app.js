'use strict'
//YongHo Moon, D18127617
//Academic purpose chat-bot development

//db는 서버랑 연결되어있고, url만 끌고온것 > 연동됨 > 쿼리로 데이터 인풋 아웃풋 가능
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const request = require('request');
const apiai = require('apiai');
const apiaiApp = apiai("ae19ed369d144e759c52fb9e93539496");
var JSSoup = require('jssoup').default;
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

var userMessage = "";
var BotMessage = "";
var Botintent = "";
var menu = "";
var location = "";
var restaurantName = [];
var restaurantLink = [];
var restaurantImg = [];
var restaurantType = [];
var restaurantLoc = [];
var restaurantPnum = [];
var userID = "";
var count = 0;

//revealing token is weak for security
var PAGE_ACCESS_TOKEN = 'EAAISBeu2DWcBAEVO5RqeXSfxqBlsjdZBc6BK2F15SYOi7AMUKux6ZAK2ZBRiSWcbZAl6P05oBkz2kBF8nA80KOL6KJTQhRC7aQ77VH6X2EuLh9ZC5EsZBbh307cmSBc46yMOZBksLS4QwDbqQWGcZAA64jYVaEsbdV5f4Erk7kZCxyWlWP5ckr4ZBL';


app.set('port', (process.env.PORT || 5000));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.send('Hello world');
})
//localhost:5000 >> Hello world

client.connect();

app.get('/webhook', function(req, res) {
    if (req.query['hub.verify_token'] === 'VERIFY_TOKEN') {
        console.log("got Webhook!");
        res.send(req.query['hub.challenge']);
    }
    res.send('Error, wrong token');
})
//create table query
client.query('CREATE TABLE IF NOT EXISTS public.userinfo (ID text, input text,location text);', (err, res) => {
    if (err) throw err;
    console.log("Create userinfo Table Query Worked.")
})
client.query('CREATE TABLE IF NOT EXISTS public.foodtype (ID text, foodtype text);', (err, res) => {
    if (err) throw err;
    console.log("Create foodtype Table Query Worked.")
})

app.post("/webhook", function(req, res) {
    console.log("WEBHOOK GET IT WORKS");
    var data = req.body;
    var userMessage = "";

    //page subscription
    if (data.object == 'page') {
        data.entry.forEach(function(pageEntry) {
            // Iterate each messaging event
            pageEntry.messaging.forEach(function(messagingEvent) {
                if (messagingEvent.optin) {
                    receivedAuthentication(messagingEvent);
                //post, receive message
                } else if (messagingEvent.message) {
                    //messagingEvent.message.text
                    console.log("message received!");
                    receivedMessage(messagingEvent);
                //포스트백
                } else if (messagingEvent.postback) {
                    console.log("postback received!");
                    receivedPostback(messagingEvent);
                } else {
                    console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                }
            });
        });
        res.sendStatus(200);
        //200 -> success
    }
});

// content = user input
// senderId = user id
// apiai = trained text
function receivedMessage(event) {
    var senderId = event.sender.id;
    var content = event.message.text;
    let apiai = apiaiApp.textRequest(content, {
    sessionId: 'play-bot' // used an arbitrary id
    });
//userID > id
//menu > input

    apiai.on('response', async (response) => {
        let aiText = response.result.fulfillment.speech;
        //let aiTrainingPhrase = response;
        if (senderId != "284675368867348"){
            console.log("userMessage checked!")
            userID = senderId
            userMessage = content
        }
        else {
            console.log("BotMessage checked!")
            BotMessage = content
        }

        if (response.result.metadata.intentName == "WelcomeMessage") {
            // console.log(aiTrainingPhrase)
            Botintent = response.result.metadata.intentName
            console.log("WelcomeMessage!!!!",aiText)
            sendTextMessage(senderId, aiText);
        }
        //restaurant recommendation
        else if (response.result.metadata.intentName == "restaurant_finder_start") {
            Botintent = response.result.metadata.intentName
            console.log("Restaurant_Finder!!!!",aiText)
            sendTextMessage(senderId, aiText);
        }
        else if ((Botintent == "restaurant_finder_start") && (response.result.metadata.intentName == "menu_asking")) {
            console.log("Menu_Asking!!!!",aiText)
            if (response.result.parameters.dish.length > 0){
                for (var n=0; n<response.result.parameters.dish.length; n++){
                    menu = menu + response.result.parameters.dish[n] + " ";
                }
            }
            if (response.result.parameters.cuisine.length > 0){
                for (n=0; n<response.result.parameters.dish.length; n++){
                    menu = menu + response.result.parameters.cuisine[n] + " ";
                }
            }
            if (response.result.parameters.venueType.length > 0){
                for (n=0; n<response.result.parameters.dish.length; n++){
                    menu = menu + response.result.parameters.venueType[n] + " ";
                }
            }
            menu = userMessage
            Botintent = response.result.metadata.intentName
            sendTextMessage(senderId, aiText);
        }
        else if ((Botintent == "menu_asking") && (response.result.metadata.intentName == "location_asking")){
            console.log("location asking!!!!");
            if (response.result.parameters.location.length > 0){
                for (n=0; n<response.result.parameters.location.street-address.length; n++){
                    location = location + response.result.parameters.location.city[n] + " ";
                }
            }
            if (response.result.parameters.location.length > 0){
                for (n=0; n<response.result.parameters.location.city.length; n++){
                    location = location + response.result.parameters.location.city[n] + " ";
                }
            }
            if (response.result.parameters.location.length > 0){
                for (n=0; n<response.result.parameters.location.admin-area.length; n++){
                    location = location + response.result.parameters.location.city[n] + " ";
                }
            }
            if (response.result.parameters.location.length > 0){
                for (n=0; n<response.result.parameters.location.country.length; n++){
                    location = location + response.result.parameters.location.city[n] + " ";
                }
            }

            location = userMessage
            Botintent = response.result.metadata.intentName
            sendTextMessage(senderId, aiText);
            client.query('insert into userinfo(ID, input,location) values (\''+userID+'\',\''+menu+'\',\''+location+'\');', (err, res) => {
                if (err) throw err;
                console.log(JSON.stringify(res.rows));
            });
            //start crawl
            restaurantCrawler(menu,location);
        } else if (((Botintent != "restaurant_finder_start") && (response.result.metadata.intentName == "menu_asking")) || ((Botintent != "menu_asking") && (response.result.metadata.intentName == "location_asking"))) {
                Botintent = response.result.metadata.intentName
                sendTextMessage(senderId, "Sorry.. Can't understand..")
        } else if(
            (response.result.metadata.intentName != "location_asking") || (response.result.metadata.intentName != "menu_asking") || 
            (response.result.metadata.intentName != "restaurant_finder_start") || (response.result.metadata.intentName != "WelcomeMessage")){
            console.log("=========");
            console.log(Botintent);
            console.log(response.result.metadata.intentName);
            console.log(senderId);
            console.log(aiText);
            console.log("=========");
            console.log("else case!!!!");
            sendTextMessage(senderId, aiText);
        }
    });

    apiai.on('error', (error) => {
        console.log(error);
    });

    apiai.end();
}

function restaurantCrawler(menu,location) {
    menu = menu.replace(" ","%20");
    location = location.replace(" ","%20");
    let url = "https://www.yelp.com/search?find_desc="+menu+"&find_loc="+location+"&ns=1&sortby=rating";
    request.get(url, async function(error,response,body){
        var soup = new JSSoup(body);
        var attrFinder = soup.findAll('a');
        for (var i=0; i<attrFinder.length; i++){
            if (attrFinder[i].attrs.class == "lemon--a__373c0__IEZFH link__373c0__29943 link-color--blue-dark__373c0__1mhJo link-size--inherit__373c0__2JXk5"){
                if (attrFinder[i].text == "read more" || attrFinder[i].text == "More Topics"){
                    continue;
                } else {
                    restaurantName.push((restaurantName.length+1)+". " + attrFinder[i].text);
                    if (restaurantName.length > 4){
                        break;
                    }
                }
            } else if (attrFinder[i].attrs.class == "lemon--a__373c0__IEZFH link__373c0__29943 photo-box-link__373c0__1AvT5 link-color--blue-dark__373c0__1mhJo link-size--default__373c0__1skgq"){
                if (restaurantLink.length > 4){
                    break;
                } else {
                    restaurantLink.push("https://www.yelp.ie" + attrFinder[i].attrs.href)
                }
            }
        }
        var addressFinder = soup.findAll('address');
        for (i=0; i<addressFinder.length; i++){
            if (addressFinder[i].attrs.class == "domtags--address__373c0__cgebO"){
                if (restaurantLoc.length > 4){
                    break;
                } else {
                    restaurantLoc.push(addressFinder[i].text);
                }
            }
        }
        var pnumFinder = soup.findAll('div');
        for (i=0; i<pnumFinder.length; i++){
            if (pnumFinder[i].attrs.class == "lemon--div__373c0__1mboc display--inline-block__373c0__2de_K u-space-b1 border-color--default__373c0__2oFDT"){
                if ((count%2) == 0){
                    var pnum = pnumFinder[i].text.replace("(","").replace(")","").replace(/ /g,"");
                    await sleep(100)
                    await restaurantPnum.push(pnum);
                    count +=1;
                } else {
                    if (count > 8){
                        break;
                    } else {
                        count+=1;
                    }
                }
            }
        }
        var imgFinder = soup.findAll('img');
        sendTextMessage(userID,"Thank you for waiting... Here are my recommendation");
        for (var j=0; j<imgFinder.length; j++){
            if (imgFinder[j].attrs.class == "lemon--img__373c0__3GQUb photo-box-img__373c0__O0tbt"){
                if (restaurantImg.length > 4){
                    break;
                } else {
                    sendImgMessage(userID,imgFinder[j].attrs.src,restaurantName[restaurantImg.length],restaurantLoc[restaurantImg.length],restaurantLink[restaurantImg.length],restaurantPnum[restaurantImg.length]);
                    await sleep(250);
                    restaurantImg.push(imgFinder[j].attrs.src);
                }
            }
        }
        var typeFinder = soup.findAll('a');
        for (j=0; j<typeFinder.length; j++){
            if (typeFinder[j].attrs.class == "lemon--a__373c0__IEZFH link__373c0__29943 link-color--inherit__373c0__15ymx link-size--default__373c0__1skgq"){
                if (restaurantType.length > 1){
                    break;
                } else {
                    var resType = typeFinder[j].text;
                    restaurantType.push(resType);
                }
            }
        }
        await sleep(1100);
        client.query('select count(*) from foodtype where id = \''+userID+'\' and foodtype = \''+restaurantType[0]+'\';', (err, res) => {
            if (err) throw err;
            if (JSON.stringify(res.rows) == '[{"count":"10"}]'){
                sendTextMessage(userID, "You searched this type of food for 10 times, watch out for your unbalanced eating..");
            }
        });
        client.query('insert into foodtype(ID, foodtype) values (\''+userID+'\',\''+restaurantType[0]+'\');', (err, res) => {
            if (err) throw err;
            console.log(JSON.stringify(res.rows));
        });
        //init
        soup="";
        attrFinder="";
        addressFinder="";
        imgFinder="";
        restaurantName = [];
        restaurantType = [];
        restaurantLink = [];
        restaurantLoc = [];
        restaurantImg = [];
        restaurantPnum = [];
        count = 0;
    });
}

function sleep(ms) {// for synchronization purpose
    return new Promise(resolve => setTimeout(resolve, ms))
 }

function receivedPostback(event) { // when got payload
    var greeting_message = "Welcome to Restaurant Recommending Bot!"
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;
    var payload = event.postback.payload;
    
    switch(payload){
        case "getStartedPayload" :
            sendTextMessage(senderID, greeting_message);
    }
    console.log("Received postback from user %d and page %d with payload '%s' " +
        "at %d", senderID, recipientID, payload, timeOfPostback);
}

function sendTextMessage(recipientId, message) {//send text
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: {
            recipient: { id: recipientId },
            message: { text: message }
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ' + response.error);
        }
    });
}

function sendImgMessage(recipientId, url,restaurantName,restaurantLoc,restaurantLink,restaurantPnum) {//send result
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: {
            recipient: { id: recipientId },
            message: { "attachment": {
                "type": "template",
                "payload": {
                  "template_type": "generic",
                  "elements": [{
                    "title": restaurantName,
                    "subtitle": restaurantLoc,
                    "image_url": url,
                    "buttons":[
                        {
                          "type":"web_url",
                          "url":restaurantLink,
                          "title":"View Website"
                        },
                        {
                            "type":"phone_number",
                            "title":"Call Restaurant",
                            "payload":"+353"+restaurantPnum
                        }
                    ]
                  }]
                }
              } }
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ' + response.error);
        }
    });
}

app.listen(app.get('port'), function() {//listening
    console.log('running on port', app.get('port'));
})