//code inspiration drawn from applications developed and adapted from workshop programs from Web information Technologies 2021 sem 1
// require .env for passcode
require('dotenv').config()    

//using the passport local strategy for passport.js
const LocalStrategy = require('passport-local').Strategy;

//importing data model for perosnal and business user for logins
const { PersonalUser } = require('../models/db');
const {BusinessUser} = require ('../models/db');
const {PersonalInfo} = require ('../models/db');
const {Connection} = require ('../models/db');
const {CompletedTask} = require ('../models/db');
const {Task} = require ('../models/db');
const {Circle} = require('../models/db');
//JWT set up for authentication
const passportJWT = require("passport-jwt");
const JwtStrategy = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;
var crypto = require("crypto");
module.exports = function(passport) {
    passport.use('jwt', new JwtStrategy({
        //allows for always extracting the token from the request header
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
        secretOrKey   : process.env.PASSPORT_KEY,
        passReqToCallback: true
    }, async(req, jwt_payload, done) => {
        try{
            let checkEmail = 0;
            //find the user in the database
            await PersonalUser.findOne({'userName':jwt_payload.body._id}, (err, user) => {
                //error encountered with findOne
                if(err || !user){
                    checkEmail = 1;
                }
                else{
                    // user found 
                    return done(null, user);
                } 
            });
            if(checkEmail == 1){
                await PersonalUser.findOne({'email':jwt_payload.body._id},(err,user)=> {
                    if(err|| !user){
                        return done(err, false, {message: "authentication failed"});
                    } else{
                        return done(null,user);
                    }
                });
            }
        }
        catch (error){
            return done(error);
        }
    }));
    passport.use('Bjwt', new JwtStrategy({
        //allows for always extracting the token from the request header
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
        secretOrKey   : process.env.PASSPORT_KEY,
        passReqToCallback: true
    }, async(req, jwt_payload, done) => {
        try{
            await BusinessUser.findOne({'email':jwt_payload.body._id}, (err, user) => {
                //error encountered with findOne
                if(err || !user){
                    return done(err, false, {message: "authentication failed"});
                }
                else{
                    // user found 
                    return done(null, user);
                } 
            });
        }
        catch (error){
            return done(error);
        }
    }));
    //Passport for personal user to log in
    passport.use('Personallogin', new LocalStrategy({
        usernameField : 'userName',     // get email and password
        passwordField : 'password'
    }, async (userName, password, done) => {
        try {
            let checkEmail = 0;
            await PersonalUser.findOne({ 'userName' :  userName }, function(err, user) {
                if (user && (user.validPassword(password)) && user.active == true){
                    return done(null, user, {message: 'Login successful'});
                }else if (user && user.active == false){
                    return done(null,false, {message: 'account not verified'})
                }else{
                    checkEmail = 1;
                }
            });
            //allow for login using email
            if(checkEmail == 1){
            await PersonalUser.findOne({'email': userName}, function(err, user){
                if(user && (user.validPassword(password)) && user.active == true){
                    return done(null,user,{message:'Login successful'})
                }else if (user && user.active == false){
                    return done(null,false, {message: 'account not verified'})
                }else{
                    return done(null, false, {message: 'User not found or info incorrect'});
                }
            })
        }
        } catch (error) {
            return done(error);
        }
    }));

    //Passport for business user to log in
    passport.use('Businesslogin', new LocalStrategy({
        usernameField : 'email',     // get email and password
        passwordField : 'password'
    }, async (email, password, done) => {
        try {
            await BusinessUser.findOne({ 'email' :  email }, function(err, user) {
                if (user && (user.validPassword(password))){
                    return done(null, user, {message: 'Login successful'});
                }else{
                    return done(null, false, {message: 'User not found or info incorrect'});
                }
            });
        } catch (error) {
            return done(error);
        }
    }));
    passport.use('Bsignup', new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true
    }, async (req, email, password, done) =>{
        try {
            let allow = 0
            //find if the signup username exists in system, if it doesn't, allow checks for email
            await BusinessUser.findOne({'email': email}, function(err, existingUser) {
                if (err) {
                    return done(err,null,{message:'unexpected issue  with Database Query'});
                }
                if (existingUser) {
                    console.log("existing");
                    return done(null, false, {message: 'That username is taken.'});
                }
                else {
                    //if username and email are both unique, save the user signup
                    var newUser = new BusinessUser();
                    newUser.email = req.body.email;
                    // hash password to provide security
                    newUser.name = req.body.name;
                    newUser.description = req.body.description;
                    newUser.password = newUser.hashPassword(password);
                    
                    newUser.save(function(err) {
                        if (err)
                            throw err;
                        return done(null, newUser,{message:'Signup successful'});
                });
                }
            });

        }catch (error) {
            return done(error);
        }
    }));    
    // local strategy for for signup
    passport.use('signup', new LocalStrategy({
        usernameField : 'userName',
        passwordField : 'password',
        passReqToCallback : true
    }, async (req, userName, password, done) =>{
        try {
            let allow = 0
            //find if the signup username exists in system, if it doesn't, allow checks for email
            await PersonalUser.findOne({'userName': userName}, function(err, existingUser) {
                if (err) {
                    console.log(err);
                    return done(err,null,{message:'unexpected issue  with Database Query'});
                }
                if (existingUser) {
                    console.log("existing");
                    return done(null, false, {message: 'That username is taken.'});
                }
                else {
                    allow = 1;
                }
            });
            //checking if email is unique
            if(allow == 1){
                await PersonalUser.findOne({'email':req.body.email},function(err,existingUser){
                    if(err){
                        return done(err);
                    }
                    if(existingUser){
                        return done(null,false,{message: 'That email is taken.'})
                    }
                    else{
                        //if username and email are both unique, save the user signup
                        var newUser = new PersonalUser();
                        var newConnection = new Connection();
                        var newPersonal = new PersonalInfo();
                        var newCTask = [new CompletedTask()];
                        newPersonal.nameFamily = req.body.nameFamily;
                        newPersonal.nameGiven = req.body.nameGiven;
                        newUser.connections = newConnection;
                        newUser.userName= userName;
                        // hash password to provide security
                        newUser.personalInfo = newPersonal;
                        newUser.completedTask = newCTask;
                        newUser.password = newUser.hashPassword(password);
                        newUser.email = req.body.email;
                        newUser.tagList = [];
                        //set initial account activate to false
                        newUser.active = false;
                        //randomise the secretid
                        newUser.secretID = crypto.randomBytes(16).toString('hex');
                        newUser.save(function(err) {
                            if (err)
                                throw err;
                            return done(null, newUser,{message:'Signup successful'});
                    });
                    }
                })
            }
        }catch (error) {
            return done(error);
        }
    }));    
};