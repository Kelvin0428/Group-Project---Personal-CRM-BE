//--code inspiration drawn from applications developed and adapted from workshop programs from Web information Technologies 2021 sem 1--
// require mongodb connectiong
require('./models/index.js')

// requiring necessary modules
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const passport = require('passport');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv').config()

require('./config/passport')(passport);


// assign constant to express app
const app = express()

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(express.static('public'))

app.use(cors({
  credentials: true, 
  //origin: "http://localhost:3000" 
  origin: "https://it-pol.herokuapp.com"
}));

app.use(session({ secret: process.env.PASSPORT_KEY,
  resave: true,
  saveUninitialized: true
}));

app.use(passport.initialize());

app.use(passport.session());

//set up CRM routes
const CRMRouter = require('./routes/CRMRouter.js')
const AuthenRouter = require('./routes/AuthenRouter.js')
const BusinessRouter = require('./routes/BusinessRouter.js')
app.use('/', CRMRouter);
app.use('/authenticate',AuthenRouter)
app.use('/business',BusinessRouter);

app.all('*', (req, res) => {res.send('Invalid Route')})
//--------------------------------------------------------//


var nodemailer = require('nodemailer');
const mongoose = require('mongoose')
const PersonalUser = mongoose.model('PersonalUser')
const CronJob = require('cron').CronJob;
const Event = mongoose.model('Event')



//the following code executes at 00:00 per day
async function callfunc(){
  const users = await PersonalUser.find();
  //for all users, check their respective tasks, and send email if guards are met
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user: 'polarcirclecrm@gmail.com',
        pass: 'paralleloflatitude'
    }
  });
  var mailDetails;
  for(let i=0;i<users.length;i++){
    let tasks = users[i].tasks;
    let events = users[i].events;
    for(let j=0;j<events.length;j++){
      let eve = await Event.findOne({_id:events[j]})
      var currentTime = new Date();
      if(eve.isNotified == false && eve.eventDate.getFullYear() == currentTime.getFullYear() && eve.eventDate.getMonth() == currentTime.getMonth() && eve.eventDate.getDate() - 1 == currentTime.getDate()){

        //set up mail details, the recipient and content)
        mailDetails = {
          from: 'polarcirclecrm@gmail.com',
          to: users[i].email,
          subject: 'Event: ' + eve.eventName + ' - Notification',
          //includes days left till dead line in email
          html: "<header style ='background-color:AliceBlue;'><h1 style='background-color:DeepSkyBlue; color:white'>Polar Circle</h1><h2>Hi " + users[i].personalInfo.nameGiven + "</h2> <br><br><h3>This is a reminder that you have " + eve.eventName + " tomorrow</h3><br><br> <small>This email address is not being monitored. Please do not reply to this email</small></header>"
        }
        //send the mail
        transporter.sendMail(mailDetails, function(error, info){
          if(error){
              console.log(error);
          }else{
              console.log('Email sent:' + info.response)
          }
        })
        eve.isNotified = true;
        await eve.save();
      }
    }
    for(let j=0;j<tasks.length;j++){
      //it the tasks is already completed, or users dont want notification, or it is already notified, then dont send the email
      if(tasks[j].status != 'completed' && tasks[j].highlight == false){
        var currentTime = new Date();
        var startTime = tasks[j].createdDate;
        var endTime = tasks[j].dueDate;
        var timeDif = endTime.getTime() - startTime.getTime();
        //milliseconds per day
       //the number of days from when the task is made and its due date
        let msPDay = 24 * 60 * 60 * 1000;
        var daysDif = timeDif / msPDay;
        //number of days left from current time to due date
        var timeLeft = endTime.getTime() - currentTime.getTime();
        var daysLeft = Math.ceil(timeLeft /msPDay)
        //the number here (currently 0) is the minimun days where the user received email, ex. task created today, set to due tomorrow,
        //user will receive mail today. Perhaps change to 1,2 or 3
        if(daysDif >= 0){
          // notify the date when 80% of the time has passed. for example, in a task with 7 days, at the 5th day an email will be sent
          let notifyDays  = Math.floor(daysDif * 0.8);
          var notifyDate = new Date(startTime);
          notifyDate.setDate(notifyDate.getDate() + notifyDays);
          //if when you are suppose to notify is earlier than current time, then send the email
          if(notifyDate <= currentTime && tasks[j].wantNotified == true && tasks[j].isNotified == false){
            console.log(notifyDate);
            //sending the eail
            //set up mail details, the recipient and content
            mailDetails = {
              from: 'polarcirclecrm@gmail.com',
              to: users[i].email,
              subject: 'Task: ' + tasks[j].taskName + ' - Notification',
              //includes days left till dead line in email
              html: "<header style ='background-color:AliceBlue;'><h1 style='background-color:DeepSkyBlue; color:white'>Polar Circle</h1><h2>Hi " + users[i].personalInfo.nameGiven + "</h2> <br><br><h3>This is a reminder that you have " + daysLeft + " days left on your task: " + tasks[j].taskName + "</h3><br><br> <small>This email address is not being monitored. Please do not reply to this email</small></header>"
            }
            //send the mail
            transporter.sendMail(mailDetails, function(error, info){
              if(error){
                  console.log(error);
              }else{
                  console.log('Email sent:' + info.response)
              }
            })
            // set the task to notified, so a notification email doesnt get sent again, this can be changed so that a notification email gets sent each day
            //after the 80% mark
            users[i].tasks[j].highlight = true;
            users[i].tasks[j].isNotified = true; 
            await users[i].save();
          }else if (notifyDate <= currentTime && tasks[j].wantNotified == false){
            users[i].tasks[j].highlight = true;
            await users[i].save();

          }
        //if the difference in days is less than the guard, then we aren't able to send notification emails
        }else{
          console.log("I cant travel back in time");
        }
      }
    }
  }
}
//call it every 10th minute
const Notify = new CronJob('*/10 * * * *', callfunc, null, false, 'Australia/Melbourne',);
  
Notify.start() 


// listening on Port address if active, or else on local host 8000
//the guard is to prevent listen EADDRINUSE: address already in use :: 8000 issue
if(process.env.NODE_ENV != 'test'){
  app.listen(process.env.PORT || 8000, () => {
  console.log("Connected")
})}
module.exports = app