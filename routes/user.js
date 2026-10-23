const express=require("express");
const router=express.Router();
const User=require("../models/user.js");
const warpAsync = require("../utiles/warpAsync.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../middilware.js");

const userController=require("../controllers/user.js");
const { route } = require("./listing.js");

router.route("/signup")
.get((userController.renderSignupForm))
.post(warpAsync(userController.signUp));

router.route("/login")
.get(userController.renderLoginForm)
.post(
    saveRedirectUrl,
    passport.authenticate("local",
        {failureRedirect:'/login',
        failureFlash:true,
        }),userController.login);

router.get("/logout",userController.logOut);        

module.exports= router;