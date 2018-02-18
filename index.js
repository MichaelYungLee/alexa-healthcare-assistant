/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills
 * nodejs skill development kit.
 * This sample supports multiple lauguages. (en-US, en-GB, de-DE).
 * The Intent Schema, Custom Slots and Sample Utterances for this skill, as well
 * as testing instructions are located at https://github.com/alexa/skill-sample-nodejs-fact
 **/

'use strict';

const languageStrings = {
    'en': {
        'translation': {
            'WELCOME' : "Welcome to Healthcare Assistant!",
            'HELP'    : "What can I help you with?",
            'ABOUT'   : "Healthcare Assistant aids you in finding therepists and scheduling an initial appointments.",
            'STOP'    : "Okay, see you next time!"
        }
    }
};

var Alexa = require('alexa-sdk');
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var AmazonDateParser = require('amazon-date-parser');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_PATH = 'creds.json';
var global_oauth2;
var calendar = google.calendar('v3');

const APP_ID = "amzn1.ask.skill.55a08b3e-b2f4-4d88-98ed-8aade1897fc4"; 

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context, callback);
    alexa.APP_ID = APP_ID;
    //alexa.dynamoDBTableName = 'YourTableName'; // creates new table for session.attributes
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const user = {
	"name": "Michael Lee",
	"calendar": "q6np9cj178bke4na0gdkmvik74@group.calendar.google.com"
}

const cities = {
    "Stanford": {
    	"therapists": [
    	]
    },
    "Los Angeles": {
        "therapists": [
            {
                "name": "Linus",
                "rating": 4.2,
                "calendar": "eeo7f4gigsuqd8ec80ec4ao8fk@group.calendar.google.com",
                "address": "12304 California State Route 2, Los Angeles, CA 90025"
            },
            {
                "name": "Kristina",
                "rating": 4.5,
                "calendar": "mk8nk6grm6msmrl7rjnp4gfvfc@group.calendar.google.com", 
                "address": "3201 Wilshire Blvd #201, Santa Monica, CA 90403"
            },
            {
                "name": "Benjamin",
                "rating": 5.0,
                "calendar": "hcko1utqiift7l0ombv5g8m548@group.calendar.google.com",
                "address": "12011 San Vicente Blvd Suite 225A, Los Angeles, CA 90049"
            }, 
            {
                "name": "Rachel",
                "rating": 3.7,
                "calendar": "ksdfj0a9ecp6g4887036mk7u9k@group.calendar.google.com", 
                "address": "9401 Wilshire Blvd, Beverly Hills, CA 90212"
            }
        ]
    },
    "San Diego": {
    	"therapists": [
    	]
    },
    "San Francisco": {
    	"therapists": [
    	{
    			"name": "Jordan",
    			"rating": 3.6,
    			"calendar": "healthcare.assistant.patient@gmail.com",
    			"address": "temp address"
    		}
    	]
    },
    "Sacramento": {
    	"therapists": [
    	]
    },
    "Fresno": {
    	"therapists": [
    	]
    },
}

const handlers = {
    'LaunchRequest': function () {
        let say = this.t('WELCOME') + ' ' + this.t('HELP');
        this.response.speak(say).listen("Sorry, I didn't get that. What can I help you with?");
        this.emit(':responseReady');
    },

    'AboutIntent': function () {
        this.response.speak(this.t('ABOUT')).listen("What can I help you with?");
        this.emit(':responseReady');
    },
    'ScheduleIntent': function() {
        this.response.speak("Okay. Where would you like to search for a therapist?").listen();
        this.emit(":responseReady");
    },
    'LocationIntent': function() {
        var searchCity = this.event.request.intent.slots.location.value;
        this.attributes["city"] = searchCity;
        var speechOutput = "";
        if (cities.hasOwnProperty(searchCity)) {
            var numberOfTherapists = cities[searchCity]["therapists"].length;
            if (numberOfTherapists > 0) {
           		var bestTherapists = removeUnderratedTherapists(searchCity);
            	speechOutput += ("I found " + numberOfTherapists + " therapists in " + searchCity + ". ");
            	if (bestTherapists.length > 0) {
            		speechOutput += "The top-rated therapists are ";
            		for (var i = 0; i < bestTherapists.length; i++) {
                		speechOutput += (bestTherapists[i].name + " with a " + bestTherapists[i].rating + "rating, ");
            		}
            	}
            	else {
            		speechOutput += "They are ";
            		for (var i = 0; i < numberOfTherapists; i++)
            			speechOutput += (cities[searchCity]["therapists"][i].name + ", ");
            	}
           		speechOutput += ". Which therapist would you like to schedule with?";
            	this.response.speak(speechOutput).listen("Which therapist would you like to schedule with?");
        	}
        	else {
        		speechOutput += "Sorry, I did not find any therapists in " + searchCity;
            	this.response.speak(speechOutput).listen("Is there another city you would like to search?");
        	}
        }
        else {
            speechOutput += "Sorry, I could not locate that " + searchCity;
            this.response.speak(speechOutput).listen("Is there another city you would like to search?");
        }
        this.emit(":responseReady");
    },
    'TherapistIntent': function() {
    	var therapist = this.event.request.intent.slots.therapist.value;
    	this.attributes["therapist"] = therapist;
    	this.response.speak("Accessing " + therapist + "'s calendar.").listen("What day would you like an appointment?");
    	this.emit(":responseReady");
    },
    'DateIntent': function() {
    	this.attributes["date"] = this.event.request.intent.slots.date.value;
    	this.response.speak("Okay. I've found open times for 10 a.m., 2 p.m., and 4 p.m.").listen("What time would you like?");
    	this.emit(":responseReady");
    },
    'TimeIntent': function() {
    	var time = this.event.request.intent.slots.time.value;
    	this.response.speak("Okay. I am sending " + this.attributes["therapist"] + "a calendar invite for an appointment on " + this.attributes["date"] + " at " + ". You will receive an email confirmation when they accept the appointment.");
		this.emit(":responseReady");    
    },
    'AMAZON.HelpIntent': function () {
        this.response.speak(this.t('HELP')).listen(this.t('HELP'));
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(this.t('STOP'));
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.emit('SessionEndedRequest');
    },
    'SessionEndedRequest': function () {
        this.response.speak(this.t('STOP'));
        this.emit(':responseReady');
    }
};

// Helper Functions
function removeUnderratedTherapists(location) {
    var returnList = [];
    var therapistList = cities[location]["therapists"];
    for (var i = 0; i < therapistList.length; i++) {
        if (therapistList[i].rating >= 4.0) {
            returnList.push(therapistList[i]);
        }
    }
    return returnList;
}

function convertAmazonDateToGoogleDate(date) {
	var googleDate = "";
    var monthDecimal = "";
    switch (date.substr(4, 3)) {
    	case "Jan":
        	monthDecimal = "01";
            break;
        case "Feb":
        	monthDecimal = "02";
            break;
        case "Mar":
        	monthDecimal = "03";
            break;
        case "Apr":
        	monthDecimal = "04";
            break;
        case "May":
            monthDecimal = "05";
            break;
        case "Jun":
        	monthDecimal = "06";
            break;
        case "Jul":
        	monthDecimal = "07";
            break;
        case "Aug":
        	monthDecimal = "08";
            break;
        case "Sep":
        	monthDecimal = "09";
            break;
        case "Oct":
        	monthDecimal = "10";
            break;
        case "Nov":
        	monthDecimal = "11";
            break;
        case "Dec":
        	monthDecimal = "12";
            break;
        default:
        	monthDecimal = "";
            break;
    }
    googleDate += date.substr(11, 4) + "-" + monthDecimal + "-" + date.substr(8, 2) + "T" + date.substr(16,8) + date.substr(28,5);
    return googleDate;
}