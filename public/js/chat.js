// connect to Socket.io server on client-side
const socket = io();

// Elements
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $sendLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

// Utility Functions
const capitalizeFirstLetter = (username) => {
  return username.charAt(0).toUpperCase() + username.slice(1);
};

const autoscroll = () => {
  // New message element
  const $newMessage = $messages.lastElementChild;

  // Height of the new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  // Visible height
  const visibleHeight = $messages.offsetHeight;

  // Height of messages container
  const containerHeight = $messages.scrollHeight;

  // How far have I scrolled?
  const scrollOffset = $messages.scrollTop + visibleHeight;

  // If scrolled to the bottom before new message received
  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on('message', (message) => {
  console.log(message);

  // Capitalize Display Name
  const capitalizedUsername = capitalizeFirstLetter(message.username);

  const html = Mustache.render(messageTemplate, {
    username: capitalizedUsername,
    message: message.text,
    createdAt: moment(message.createdAt).format('(h:mm A)'),
  });
  $messages.insertAdjacentHTML('beforeend', html);

  autoscroll();
});

socket.on('locationMessage', (message) => {
  console.log(message);

  // Capitalize Display Name
  const capitalizedUsername = capitalizeFirstLetter(message.username);

  const html = Mustache.render(locationMessageTemplate, {
    username: capitalizedUsername,
    url: message.url,
    createdAt: moment(message.createdAt).format('(h:mm A)'),
  });
  $messages.insertAdjacentHTML('beforeend', html);

  autoscroll();
});

socket.on('roomData', ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  document.querySelector('#sidebar').innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
  e.preventDefault();

  //disable form
  $messageFormButton.setAttribute('disabled', 'disabled');

  // Accessing using input name inside form, will not break if HTML changes
  const message = e.target.elements.message.value;
  socket.emit('sendMessage', message, (error) => {
    // enable form
    $messageFormButton.removeAttribute('disabled');
    $messageFormInput.value = '';
    $messageFormInput.focus();

    if (error) {
      return console.log(error);
    }

    console.log('Message delievered!');
  });
});

$sendLocationButton.addEventListener('click', () => {
  if (!navigator.geolocation) {
    return alert('Geolocation is not supported by your browser.');
  }

  $sendLocationButton.setAttribute('disabled', 'disabled');

  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit(
      'sendLocation',
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        $sendLocationButton.removeAttribute('disabled');
        console.log('Location shared!');
      }
    );
  });
});

socket.emit('join', { username, room }, (error) => {
  if (error) {
    alert(error);

    //redirect to the root of the page using 'location' API
    location.href = '/';
  }
});
