// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// Connecting to database
var mongo = require("mongodb").MongoClient;

// valid http website
app.use(/\/new\/https?:\/\/((\w+[.]\w+)|[.]\w+)(:\d+)?/, function(request, response) {
  
  // returns true if the url is over https protocol
  function isHttps(url) {
    if (url[9] == 's') {
      return true;
    }
    return false;
  }
  
  // connect to database
  mongo.connect(process.env.MONGO, function(err, db) {
    // storing data in url collection
    var collection = db.collection("url");
    
    var url = request.originalUrl.substring(5, request.originalUrl.length);
    var found = false;
    
    // finding whether url already exists in the database
    collection.find({"website": url}).toArray(function(err, data) {
      try {
        // if short url already exists return it
        if (data != []) {
          var json = {"original_url": data[0].website, 
                      "short_url": "https://" + request.headers.host + "/" + data[0].shortUrl};
          response.end(JSON.stringify(json));
          found = true;
        }  
      }
      // url not in the database
      catch (err) {
        console.log("first entry");
      }
    });
    
    // url not already exists, add it to database and generate a short url
    if (!found) {
      var shortUrl = Math.round(Math.random() * 10000);
      
      // check that the short url does not already exist
      collection.find({"shortUrl": shortUrl}).toArray(function(err, data) {
        try {
          while (true) {
            var same = false;
            for (var i = 0; i < data.length; i++) {
              if (parseInt(data[i].shortUrl) == shortUrl) {
                same = true;
              }
            }       
            if (same == true) {
             shortUrl = Math.round(Math.random() * 10000); 
            }
            else {
              break;
            }
          }
        }
        catch (err) {
          console.log("not in here");  
        }
      });
      
      // insert the entry inside the database
      collection.insert({"website": url, "shortUrl": shortUrl}, function(err, data) {
        var json = {"original_url": data.ops[0].website, 
                      "short_url": "https://" + request.headers.host + "/" + data.ops[0].shortUrl};
        response.end(JSON.stringify(json));
      });
    }
      
    db.close();
  });
  
});


// invalid url entered
app.use("/new/", function(request, response) {
  console.log(request.url)
  var json = {"error": "Wrong url format. Correct format - (http://www.example.com)"};
  response.end(JSON.stringify(json));
})

// http://expressjs.com/en/starter/basic-routing.html
app.use("/", function (request, response) {
  //response.end(process.env.MONGO);
  
  // homepage
  if (request.url == "/") {
    response.sendFile(__dirname + '/views/index.html');  
  }
  // looking for short url, verify
  else {
    console.log(request.url);
    // given url
    var url = request.url.substring(1, request.url.length);
    
    // if its a number look up in the database
    if (parseInt(url)) {
      // connect to database
      mongo.connect(process.env.MONGO, function(err, db) {
        var collection = db.collection("url");

        var found = false;
        
        collection.find({"shortUrl": parseInt(url)}).toArray(function(err, data) {
          try {
            console.log(data);
            
            // short url in the database, redirect to original website
            if (data != []) {
              found = true;
              response.redirect(data[0].website);
            }
            
          }
          // short url not in database
          catch (err) {
            console.log("show error");
            var json = {"error": "This url is not in the database"};
            response.end(JSON.stringify(json));
          }
          
          
        });
        
        db.close();
      });  
    } 
    // short url not a number
    else {
      console.log("show error");
      var json = {"error": "This url is not in the database"};
      response.end(JSON.stringify(json));
    }
    
  }
  
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
