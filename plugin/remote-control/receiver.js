var RemoteControl = (function() {
  if (!navigator.presentation || ! navigator.presentation.receiver) {
//    console.warn('not in receiver window');
//    return {};
    var conn = {
      get state() { return 'connected'; },
      set onmessage(callback) {
        this._callback = callback;
      },
      get onmessage() {
        return this._callback;
      },
      send: function(msg) {
        window.opener.postMessage(msg, '*');
      }
    };

    window.addEventListener('message', function(e) {
      conn._callback(e);
    });
    navigator.presentation = {
      receiver: {
        get connectionList() {
          return Promise.resolve({
            get connections() {
              return [conn];
            },
          })
        }
      }
    };
  }

  var conn;

  function post() {
    if (!conn) {
      console.error('presentation connection is not available');
      return;
    }
    var slideElement = Reveal.getCurrentSlide();
    var notesElement = slideElement.querySelector( 'aside.notes' );

    var messageData = {
      notes: '',
      markdown: false,
      whitespace: 'normal',
      state: Reveal.getState()
    };

    // Look for notes defined in a slide attribute
    if( slideElement.hasAttribute( 'data-notes' ) ) {
      messageData.notes = slideElement.getAttribute( 'data-notes' );
      messageData.whitespace = 'pre-wrap';
    }

    // Look for notes defined in an aside element
    if( notesElement ) {
      messageData.notes = notesElement.innerHTML;
      messageData.markdown = typeof notesElement.getAttribute( 'data-markdown' ) === 'string';
    }

    var msg = {
      type: 'status',
      data: messageData,
    }

    try {
      console.log('receiver send status');
      conn.send(JSON.stringify(msg));
    }catch(e){
      console.error('receiver send error: ' + e);
    }
  }

  function onCommand(cmd) {
    switch (cmd.type) {
      case 'next':
        Reveal.next();
        break;
      case 'prev':
        Reveal.prev();
        break;
      default:
        console.warn('unknown command: ' + JSON.stringify(cmd));
        return;
    }
    post();
  }

  console.log('reciever init connetion');
  navigator.presentation.receiver.connectionList
  .then(function(connList) {
    conn = connList.connections[0];
//    conn.addEventListener('message', function(event) {
    console.log('receiver - conn state:' + conn.state);
    conn.onmessage = function(event) {
      console.log('on message: ' + event.data);
      var cmd = JSON.parse(event.data);
      onCommand(cmd);
    };
    Reveal.configure({ controls: false,
                       history: false });
    post();
    if (conn.state !== 'connected') {
      conn.addEventListener('connect', post);
    }
  }).catch(function(e) {
    console.error('reciever init error: ' + e);
  });
})();
