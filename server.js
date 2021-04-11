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
let db = mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
useFindAndModify: false,
}, (error) => {
  if (error) console.log(error);
    console.log("connection to the DB successful");
});
//start

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true },
});
const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date },
});
var User = mongoose.model("User", userSchema);

var Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/exercise/new-user", (req, res) => {
  const userName = req.body.username;
  console.log(req.body);
  User.find({ username: userName }, "username", (err, result) => {
    if (result.length) {
      res.send("User exist " + result);
    } else if (err) {
      console.err("Error!: " + err);
    } else {
      const newUser = new User({
        username: userName,
      });
      newUser.save((err, result) => {
        if (err) {
          console.error(err);
        }
        console.log(result);
        res.send(result);
      });
    }
  });
});

app.get("/api/exercise/users", (req, res) => {
  User.find({}, (err, result) => {
    if (err) {
      console.error(err);
    }
    res.json(result);
  });
});

app.get("/api/exercise/remove", (req, res) => {
  Exercise.deleteMany({}, (err, response) => {
    if (err) {
      console.error(err);
    }
    res.json(response);
  });
});



app.get("/api/exercise/log", (req, res) => {
  const queryUserId = req.query.userId;
  const queryFrom = new Date(req.query.from);
  const queryTo = new Date(req.query.to);
  const queryLimit = req.query.limit;
  console.log(req.body);
  const findQuery = (queryUserId, queryFrom, queryTo) => {
    if (queryTo == "Invalid Date" || queryFrom == "Invalid Date") {
      return { userId: queryUserId };
    } else {
      return { userId: queryUserId, date: { $gte: queryFrom, $lt: queryTo } };
    }
  };
  User.findById(queryUserId, "username", (err, userInfo) => {
    if (err) {
      console.error("Error: " + err);
    }
    Exercise.find(findQuery(queryUserId, queryFrom, queryTo))
      .limit(Number(queryLimit))
      .exec((err, exercisesList) => {
        if (err) {
          console.error(err);
        }
        res.json({
          _id: queryUserId,
          username: userInfo.username,
          count: exercisesList.length,
          log: exercisesList.map((exercise) => ({
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString(),
          })),
        });
      });
  });
});


app.post("/api/exercise/add", (req, res) => {
  const userId = req.body.userId;
  const description = req.body.description;
  const duration = req.body.duration;
  const date = req.body.date;
  const createDate = (date) => {
    console.log(req.body);
    if (date !== undefined) {
      if (new Date(date) == "Invalid Date") {
        return new Date();
      } else {
        return new Date(date);
      }
    } else {
      return new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate()
      );
    }
  };

  const newExercise = new Exercise({
    userId: userId,
    description: description,
    duration: duration,
    date: createDate(date),
  });

  newExercise.save((err, exerciseInfo) => {
    if (err) {
      console.error(err);
    }
    User.findById(exerciseInfo.userId, (err, userData) => {
      if (err) {
        console.error(err);
      }
      res.json({
        _id: userData._id,
        username: userData.username,

        date: new Date(exerciseInfo.date).toDateString(),
        duration: exerciseInfo.duration,
        description: exerciseInfo.description,
      });
    });
  });
});


//end
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
