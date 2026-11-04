
// Load environment variables only in development
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utiles/ExpressError.js");

const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// Environment variables
const dbUrl = process.env.ATLASDB_URL;
const sessionSecret = process.env.SECRET;
const PORT = process.env.PORT || 8080;

// Validate required environment variables
if (!dbUrl || !sessionSecret) {
    throw new Error(
        "Missing required environment variables: ATLASDB_URL or SECRET"
    );
}

// EJS configuration
app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// MongoDB session store
const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: sessionSecret
    },
    touchAfter: 24 * 3600
});

// MongoDB session store error handler
store.on("error", (err) => {
    console.log("ERROR IN MONGO SESSION STORE:", err);
});

// Session configuration
const sessionOptions = {
    store,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }
};

// Session and flash middleware
app.use(session(sessionOptions));
app.use(flash());

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Flash messages and current user
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// Application routes
app.get("/",(req,res)=>{
 res.render("show.ejs");
});
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// 404 error handling
app.all("/{*splat}", (req, res, next) => {
    next(new ExpressError(404, "Page not found"));
});

// General error handling
app.use((err, req, res, next) => {
    const {
        statusCode = 500,
        message = "Something went wrong"
    } = err;

    res.status(statusCode).render("error.ejs", { message });
});

// Start server after successful database connection
async function startServer() {
    try {
        await mongoose.connect(dbUrl);

        console.log("Connected to MongoDB");

        app.listen(PORT, () => {
            console.log(`Wanderlust server running on port ${PORT}`);
        });

    } catch (err) {
        console.error("SERVER STARTUP ERROR:", err);
        process.exit(1);
    }
}

startServer();
