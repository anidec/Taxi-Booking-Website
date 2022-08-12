require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const nodemailer = require("nodemailer");
const mailGun = require("nodemailer-mailgun-transport");
const app = express();

app.set("view engine", "ejs");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.TEXT,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
//current User
app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  next();
});
//MIDDLEWARE
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

mongoose.connect(process.env.DATABASE, { useNewUrlParser: true });

const driverSchema = new mongoose.Schema({
  name: String,
  mnumber: Number,
  email: String,
  address: String,
  availability: String,
  imageurl: String,
});
const rentSchema = new mongoose.Schema({
  name: String,
  mnumber: Number,
  email: String,
  address: String,
  source: String,
  destination: String,
  imageurl: String,
});
const subscribeSchema = new mongoose.Schema({
  email: String,
});

const userSchema = new mongoose.Schema({
  name: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const Driverinfo = new mongoose.model("Driverinfo", driverSchema);
const Rentinfo = new mongoose.model("Rentinfo", rentSchema);
const Subscribeinfo = new mongoose.model("Subscribeinfo", subscribeSchema);
const UserInfo = new mongoose.model("UserInfo", userSchema);

passport.use(UserInfo.createStrategy());
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  UserInfo.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/book",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log(profile);
      UserInfo.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.route("/").get(function (req, res) {
  res.render("index");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/book",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
  }
);

app.get("/login", function (req, res) {
  res.render("login");
});

app
  .route("/driver_details")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      res.render("driver_details");
    } else {
      res.redirect("/login");
    }
  })
  .post(function (req, res) {
    const newinfo = new Driverinfo({
      name: req.body.name,
      mnumber: req.body.number,
      email: req.body.email,
      address: req.body.address,
      availability: req.body.availability,
      imageurl: req.body.url,
    });
    newinfo.save();
    res.send("done");
  });

app
  .route("/rent_details")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      res.render("rent_details");
    } else {
      res.redirect("/login");
    }
  })
  .post(function (req, res) {
    const newinfo = new Rentinfo({
      name: req.body.name,
      mnumber: req.body.number,
      email: req.body.email,
      address: req.body.address,
      source: req.body.source,
      destination: req.body.destination,
      imageurl: req.body.img,
    });
    newinfo.save();
    console.log(newinfo.id);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "door2door.jiit@gmail.com",
        pass: "Sameeravish@2022",
      },
    });
    const mailOptions = {
      from: "door2door.jiit@gmail.com",
      to: req.body.email,
      subject: "regarding Taxi services.",
      text: `Hello ${req.body.name} thanks for registering for our Services. We will get back to you after some time.`,
    };
    transporter.sendMail(mailOptions, function (err, data) {
      if (err) console.log(err);
      else console.log("message sent");
    });
    res.render("landing_page", { info: newinfo });
  });

app
  .route("/subscribe")

  .post(function (req, res) {
    const newinfo = new Subscribeinfo({
      email: req.body.emailsubs,
    });
    newinfo.save();
  });

app.get("/edit/:id", function (req, res) {
  Rentinfo.findOne({ _id: req.params.id }, function (err, foundid) {
    if (foundid) {
      res.render("rent_page_updated", { info: foundid });
    } else res.send("not found");
  });
});

app.post("/rent_details_update/:id", function (req, res) {
  Rentinfo.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      mnumber: req.body.number,
      email: req.body.email,
      address: req.body.address,
      source: req.body.source,
      destination: req.body.destination,
      imageurl: req.body.img,
    },
    function (err, docs) {
      if (err) {
        console.log(err);
      }
    }
  );
  Rentinfo.findOne({ _id: req.params.id }, function (err, foundid) {
    if (foundid) {
      res.render("landing_page", { info: foundid });
    } else res.send("not found");
  });
});

app.post("/register", function (req, res) {
  UserInfo.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.render("login");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const user = new UserInfo({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) console.log(err);
    else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/");
      });
    }
  });
});
app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});
app.listen(3000, function () {
  console.log("Server started on port 3000");
});
