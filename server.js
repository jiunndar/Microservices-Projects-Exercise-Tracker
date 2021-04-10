require('dotenv').config();

/** # MONGOOSE SETUP #
/*  ================== */

/** 1) Install & Set up mongoose */
const mongoose = require('mongoose');

const express = require('express');
const mongo = require('mongodb');

const app = express();
const bodyParser = require('body-parser');
const moment = require('moment');

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that API is remotely testable by FCC 
let cors = require('cors');
app.use(cors());

// basic configuration 
let port = process.env.PORT || 3000;


mongoose.connect(process.env.MONGO_URI);


// connect to the DB
let db = mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }, (error) => {
  if (error) console.log(error);
    console.log("connection to the DB successful");
});


const dataSchema = new mongoose.Schema({
  _id: String,
  username: String,
  exercise: [
    {
      description: String, 
      duration: Number,
      date: Date
    }
  ]
});

const Data = mongoose.model("Data", dataSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));

app.get("/", (req, res) => {

  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/exercise/new-user", (req, res) => {
  res.json({ hello: "hi there..." });
});


app.post("/api/exercise/new-user", (req, res) => {
  let uname = req.body.username;

  Data.findOne({ username: uname }, (err, doc) => {
 
    if (doc) {
      res.json("Error: Username already taken.");
    } else {
     
      let id = makeid();
      let data = new Data({
        _id: id,
        username: uname
      });
    
      data.save(err, doc => {
        if (err) return console.log("Error: ", err);
        res.json({
          username: uname,
          _id: data._id
        });
      });
    }
  });
});


app.get("/api/exercise/users", (req, res) => {
  Data.find({}, (err, doc) => {
    if (err) return console.log("Error: ", err);
    let responseArray = [];
    for (let entry in doc) {
      responseArray.push({
        username: doc[entry].username,
        _id: doc[entry]._id
      });
    }
    res.json(responseArray);
  });
});


app.post("/api/exercise/add", (req, res) => {
  
  let input = req.body;
  if (!input.userId || !input.description || !input.duration) {
    res.send(
      "Error: User ID, Description and Duration are required fields."
    );
  } else if (!input.date) {
    input.date = new Date();
  }
  let date = new Date(input.date).toDateString();
  let duration = parseInt(input.duration);
  

  let exerciseInstance = {
    description: input.description,
    duration: duration,
    date: handleDate(date) 
  };

  Data.findByIdAndUpdate(
    input.userId,
    { $push: { exercise: exerciseInstance } },
    (err, doc) => {
      if (err) return console.log("Error: ", err);
      res.json({
        username: doc.username,
        description: exerciseInstance.description,
        duration: exerciseInstance.duration,
        _id: doc._id,
        date: exerciseInstance.date
      });
    }
  );
});


app.get("/api/exercise/log", (req, res) => {
  // Get queries from req object
  let userId = req.query.userId;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;

  let userInfo = {};


  if (!from && !to) {

    Data.findById(userId, (err, doc) => {
      if (err) return console.log("Error finding ID: ", err);
      if (doc == null) {
        res.send("Error: User not found.");
      } else {
        let exercise = doc.exercise;
        let log = [];

        for (let i = 0; i < limitCheck(limit, exercise.length); i++) {
          log.push({
            activity: exercise[i].description,
            duration: exercise[i].duration,
            date: exercise[i].date
          });
        }
        userInfo = {
          _id: userId,
          username: doc.username,
          count: log.length,
          log: log
        };
        res.json(userInfo);
      }
    });

  } else {
    Data.find()
      .where("_id")
      .equals(userId)
      .where("exercise.date")
      .gt(from)
      .lt(to)
      .exec((err, doc) => {
        if (err) return console.log("Error: ", err);
        if (doc.length == 0) {
          res.send(
            "Error: No data found."
          );
        } else {
          let exercise = doc[0].exercise;
          let log = [];
          for (let i = 0; i < limitCheck(limit, exercise.length); i++) {
            log.push({
              activity: exercise[i].description,
              duration: exercise[i].duration,
              date: exercise[i].date
            });
          }
          userInfo = {
            _id: userId,
            username: doc[0].username,
            count: log.length,
            log: log
          };
          res.json(userInfo);
        }
      });
  }

  let limitCheck = (i, j) => {
    if (i <= j) {
      return i;
    } else {
      return j;
    }
  };
});


app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});


app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {

    errCode = 400; 
    const keys = Object.keys(err.errors);
   
    errMessage = err.errors[keys[0]].message;
  } else {
  
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});


function makeid() {
  let randomText = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 5; i++) {
    randomText += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return randomText;
}



const handleDate = date => {
  if (!date) {
    return moment().format("YYYY-MM-DD");
  } else if (!moment(date, "YYYY-MM-DD").isValid()) {
    return moment().format("YYYY-MM-DD");
  } else {
    return date;
  }
};
