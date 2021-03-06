var timerId = 0;

/** The events that home template contains */
Template.home.events({
  /** A click on #open opens the create page */
  'click #open': function(e){
    Router.go('create');
  }
});

/** The events that create template contains */
Template.create.events({
  /** An interaction on input checks if the form is properly filled */
  'input': function(e, t) {
	var regexa = new RegExp("^[a-zA-Z0-9._-]+@[a-z0-9._-]{2,}\.[a-z]{2,4}$");
	var regexp = new RegExp("^([a-zA-Z0-9._-]+@[a-z0-9._-]{2,}\.[a-z]{2,4}\n*)+$");
	//var regexa = new RegExp("^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$");
	//var regexp = new RegExp("^((([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))\n*)+$");
	if(t.find("#animatorName").value != "" && regexa.test(t.find("#animatorEmail").value) && t.find("#meetingName").value != "" && regexp.test(t.find("#participantsEmails").value)) {
		t.find("#create").disabled = "";
	} else {
		t.find("#create").disabled = "disabled";
	}
  },
  /** A form submission creates a meeting, invites participants and opens the meeting page */
  'submit form': function(e) { 
    e.preventDefault();
    var meetingId = Meetings.insert({name: e.target.meetingName.value, status: "ongoing"});
    var userId = Users.insert({name: e.target.animatorName.value, email: e.target.animatorEmail.value, type: "animator", status: "online", meeting: meetingId});
    var participantsEmails = e.target.participantsEmails.value.split('\n');
	localStorage.setItem(meetingId, meetingId);
	Session.set("meetingId", meetingId); 
    Session.set("userId", userId);    
    Meteor.call('sendEmail', e.target.animatorEmail.value, 'noreply@taketalk.com', 'TakeTalk session created', 'You have just created a session of TakeTalk. \nHere is the link : taketalk.meteor.com/join/' + meetingId + "/" + userId);
    for(var i = 0; i < participantsEmails.length; i++) {
      userId = Users.insert({name: 'participant pending', email: participantsEmails[i], type: "participant", status: "pending", meeting: meetingId});
      Meteor.call('sendEmail', participantsEmails[i], 'noreply@taketalk.com', 'TakeTalk invitation', 'You are invited to a session of TakeTalk. \nPlease follow this link : taketalk.meteor.com/join/' + meetingId + '/' + userId);
    }
    Router.go('/meeting/' + meetingId);
  }
});

/** The events that join template contains */
Template.join.events({
  /** An interaction on input checks if the form is properly filled */
  'input': function(e, t) {
    if(t.find("#participantName").value != "") {
  	  t.find("#join").disabled = "";
    } else {
  	  t.find("#join").disabled = "disabled";
    }
  },
  /** A form submission updates the user's name and opens the meeting page */
  'submit form': function(e) {
    e.preventDefault();
    Users.update(Session.get("userId"), {$set: {name: e.target.participantName.value, status: "online"}});
    Router.go('/meeting/' + Session.get("meetingId"));
  }
});

/** The events that meeting template contains */
Template.meeting.events({
  /** A click on talkCancel opens the lineup page or cancels the user's speech */
  'click #talkCancel': function(e) {
	if(e.target.value == "Talk") {
	  Router.go('/meeting/' + Session.get("meetingId") + '/lineup');
	} else {
	  Speeches.update(Speeches.findOne({user: Session.get("userId"), status: {$in: ["ongoing", "pending"]}})._id, {$set: {status: "done"}});
	}
  },
  /** A click on waitProceed starts or stops the timer */
  'click #waitProceed': function(e) {
  	if(e.target.value == "Wait") {
  	  Meteor.clearInterval(timerId);
  	  Speeches.update(Speeches.findOne({meeting: Session.get("meetingId"), status: "ongoing"})._id, {$set: {status: "pending"}});
    } else {
      Speeches.update(Speeches.findOne({meeting: Session.get("meetingId"), status: "pending"})._id, {$set: {status: "ongoing"}});
      timerId = Meteor.setInterval(function() {
  	    Speeches.update(Speeches.findOne({meeting: Session.get("meetingId"), status: "ongoing"})._id, {$set: {timeLeft: Speeches.findOne({meeting: Session.get("meetingId"), status: "ongoing"}).timeLeft + 1}});
  	    if(Speeches.findOne({meeting: Session.get("meetingId"), status: "ongoing"}).timeLeft == Speeches.findOne({meeting: Session.get("meetingId"), status: "ongoing"}).time){
    	  Speeches.update(Speeches.findOne({meeting: Session.get("meetingId"), status: "ongoing"})._id, {$set: {status: "done"}});
          Meteor.clearInterval(timerId);
        }
	  } , 1000);
  	}
  },
  /** A click on next goes to the next speech */
  'click #next': function(e) {
	Meteor.clearInterval(timerId);
    Speeches.update(Speeches.findOne({meeting: Session.get("meetingId"), status: {$in: ["ongoing", "pending"]}})._id, {$set: {status: "done"}});
  },
  /** A click on inviteParticipants opens the invite page */
  'click #inviteParticipants': function(e) {
    Router.go('/meeting/' + Session.get("meetingId") + '/invite');
  },
  /** A click on closeMeeting closes the meeting */
  'click #closeMeeting': function(e) {
  	Meetings.update(Session.get("meetingId"), {$set: {status: "done"}});
    Session.set("meetingId", ""); 
    Session.set("userId", "");  
    Router.go("home");
  }
});

/** The events that lineup template contains */
Template.lineup.events({
  /** An interaction on input checks if the form is properly filled */
  'input': function(e, t) {
  	var regex = new RegExp("([0-9]|10)+");
    if(t.find("#subject").value != "" && t.find("#time").value >= 1 && t.find("#time").value <= 10) {
      t.find("#lineup").disabled = "";
    } else {
      t.find("#lineup").disabled = "disabled";
    }
  },
  /** A click on cancelLineup goes back to the meeting page */
  'click #cancelLineup': function(e) {
    e.preventDefault();
    Router.go('/meeting/' + Session.get("meetingId"));
  },
  /** A click on lineup creates a speech and goes back to the meeting page */
  'click #lineup': function(e, t) {
    e.preventDefault();
    Speeches.insert({subject: t.find("#subject").value, timeLeft: 0, time: t.find("#time").value * 60, status: "pending", user: Session.get("userId"), meeting: Session.get("meetingId")});
    Router.go('/meeting/' + Session.get("meetingId"));
  }
});

/** The events that invite template contains */
Template.invite.events({
  /** An interaction on input checks if the form is properly filled */
  'input textarea': function(e, t) {
  	if(t.find("#newParticipantsEmails").value != "") {
  		t.find("#invite").disabled = "";
  	} else {
  		t.find("#invite").disabled = "disabled";
  	}
  },
  /** A click on cancelInvite goes back to the meeting page */
  'click #cancelInvite': function(e) {
    e.preventDefault();
    Router.go('/meeting/' + Session.get("meetingId"));
  },
  /** A click on invite invites new participants and goes back to the meeting page */
  'click #invite': function(e, t) {
    e.preventDefault();
    var participantsEmails = t.find("#newParticipantsEmails").value.split('\n');
	var userId = "";
    for(var i = 0; i < participantsEmails.length; i++) {
      userId = Users.insert({name: 'participant pending', email: participantsEmails[i], type: "participant", status: "pending", meeting: Session.get("meetingId")});
      Meteor.call('sendEmail', participantsEmails[i], 'noreply@taketalk.com', 'TakeTalk invitation', 'You are invited to a session of TakeTalk. \nPlease follow this link : taketalktest.meteor.com/join/' + Session.get("meetingId") + '/' + userId);
    };
    Router.go('/meeting/' + Session.get("meetingId"));
  }
});