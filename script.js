var date_format = 'YYYY-MM-DD HH:mm';
var event_types = ['attending', 'created', 'declined', 'maybe', 'not_replied'];
var show_event_types = {
    'attending': 'Accepterade',
    'created': 'Mina egna',
    'maybe': 'Kanske',
    'not_replied': 'Ej besvarat'
};

var uid = false;
var events = {};

// Only works after `FB.init` is called
function myFacebookLogin() {
    console.log("fb login running...");
    FB.login(function(){
        start();
    }, {scope: 'user_events user_posts'});
}

function start() {
    FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
            // the user is logged in and has authenticated your
            // app, and response.authResponse supplies
            // the user's ID, a valid access token, a signed
            // request, and the time the access token
            // and signed request each expire
            uid = response.authResponse.userID;
            var accessToken = response.authResponse.accessToken;
            hide_login_button();
            var event_section = document.getElementById('events-created');
            for(var event_status in show_event_types) {
                var heading = show_event_types[event_status];
                var id = event_status+'-events';
                var element = document.getElementById(id);
                get_events(uid, element, event_status);
            }
        } else if (response.status === 'not_authorized') {
            document.write('not authorized');
        } else {
            document.write('not logged in');
        }
    });
}

var nexts = {};

function get_events(user_id, target_element, status, expand) {
    var params = {};
    if(typeof(status) !== 'undefined') {
        params.type = status;
    }
    FB.api('/v2.8/'+user_id+'/events', 'GET', params, function (response) {
        // console.log(response);
        // for(var field_name in response.data[0]) {
        //     console.log(field_name);
        // }

        render_events(response, target_element, status, expand);
    });
}

function get_next(target_element, status) {
    console.log("get_next:", status);
    var event_list_name = 'default';
    if(typeof(status) !== 'undefined') {
        event_list_name = status;
    }

    var page = nexts[event_list_name];
    console.log("page:", page);
    if(page !== undefined) {
        FB.api(page, 'GET', {}, function (response) {
            render_events(response, target_element, status, true);
        });
    } else {
        target_element.innerHTML = target_element.innerHTML + '<div class="card"><div class="content">Inga fler events.</div></div>';
    }
}

function index_event(event) {
    events[event.id] = event;
}

function render_events(response, target_element, status, expand) {
    var event_list_name = 'default';
    if(typeof(status) !== 'undefined') {
        event_list_name = status;
    }

    if(response.paging !== undefined && response.paging.next !== undefined) {
        nexts[event_list_name] = response.paging.next;
    }

    var new_content = '';
    var now = moment();
    for(var i in response.data) {
        var event = response.data[i];
        // Skip events in the past
        if((event.end_time !== undefined && moment(event.end_time) > now) || (event.start_time !== undefined && moment(event.start_time) > now)) {
            index_event(event);
            new_content = new_content + event_html(event);
        }
    }

    if(new_content == '') {
        console.log("No relevant events found.");
        new_content = '<div class="card"><div class="content">Inga fler events.</div></div>';
    }
    if(typeof(expand) !== 'undefined' && expand) {
        target_element.innerHTML = target_element.innerHTML + new_content;
    } else {
        target_element.innerHTML = new_content;
    }
}

function more_events(status) {
    var id = status+'-events';
    var element = document.getElementById(id);
    get_next(element, status);
}

function render_feed(response) {
    var events = '';
    console.log(response.data);
    for(var i in response.data) {
        var post = response.data[i];
        console.log(post.id);

        var story = '';
        if(post.story !== undefined) {
            story = '<p>' +
                post.story +
            '</p>';
        }
        events = events +
        '<div class="event">' +
            '<div class="label">' +
                '<img src="https://graph.facebook.com/'+post.from.id+'/picture">' +
            '</div>' +
            '<div class="content">' +
                '<div class="summary">' +
                    '<span class="user">'+post.from.name+'</span>' +
                '</div>' +
                story +
                '<p class="event-description">'+post.message+'</p>' +
                '<div class="meta">' +
                    '<div class="date">' +
                        moment(post.updated_time).format(date_format) +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '';
    }

    var html = '' +
    '<div class="ui feed">' +
    events +
    '</div>' +
    '';

    return html;
}

function show_event_feed(event_id) {
    var element = document.getElementById('modal');
    var event = events[event_id];

    FB.api('/v2.8/'+event_id+'/feed', 'GET', {'fields': 'from,message,story,updated_time'}, function (response) {
        feed = render_feed(response);
        var html = '' +
        '<div class="header">'+
            event.name +
            '<a class="corner-icon" href="https://www.facebook.com/events/'+event.id+'" target="_blank"><i class="external square icon"></i></a>' +
        '</div>' +
        '<div class="content">' +
        '<div class="ui two column stackable grid">' +
            '<div class="column">' +
                '<div class="description">' +
                '<p class="event-description">'+event.description+'</p>' +
                '</div>' +
            '</div>' +
            '<div class="column">' +
                '<div class="ui feed">' +
                feed +
                '</div>' +
            '</div>' +
        '</div>' +
        '</div>' +
        '';
        element.innerHTML = html;
        $('#modal').modal('show');
    });
}

function event_html(event) {
    var location = '';
    if(event.place !== undefined) {
        location = '<div class="location">'+event.place.name+'</div>';
    }

    var meta = '';
    if(event.start_time !== undefined || event.end_time !== undefined) {
        meta = '<div class="meta">';
        var now = moment();
        if(event.start_time !== undefined && moment(event.start_time) > now) {
            meta = meta + '<div class="date start">Start: '+moment(event.start_time).format(date_format)+'</div>';
        }
        if(event.end_time !== undefined && moment(event.end_time) > now) {
            meta = meta + '<div class="date end">Slut: '+moment(event.end_time).format(date_format)+'</div>';
        }
        meta = meta + '</div>';
    }

    var show_feed = '' +
        '<button class="ui button basic wide" onclick="show_event_feed(\''+event.id+'\')"><i class="list icon"></i> Diskussion</button>' +
        '';

    var html = ''+
        '<div class="ui card">' +
        '<div class="content">' +
        '<div class="header">' +
        '<a class="corner-icon" href="https://www.facebook.com/events/'+event.id+'" target="_blank"><i class="external square icon"></i></a>' +
        '<span>'+event.name+'</span>' +
        '</div>' +
        meta +
        location +
        show_feed +
        '</div>' +
        '</div>' +
        '';

    return html;
}

function hide_login_button() {
    document.getElementById('login-button').style.display = 'none';
}

window.fbAsyncInit = function() {
    FB.init({
        appId      : app_id,
        xfbml      : true,
        version    : 'v2.8'
    });
    FB.AppEvents.logPageView();
    myFacebookLogin();
};

(function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));
