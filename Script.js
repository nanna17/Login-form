/* =============================================
   script.js — Vault Registration Form Logic
   ============================================= */

const API_URL = 'http://localhost:5000/api/register';

/* ── Utility: get element by ID ── */
function $(id) {
  return document.getElementById(id);
}

/* ── Set field state: 'error' | 'valid' | '' ── */
function setField(fieldKey, state, message) {
  const wrapper = $('f-' + fieldKey);
  wrapper.classList.remove('error', 'valid');
  if (state) {
    wrapper.classList.add(state);
  }
  $('msg-' + fieldKey).textContent = message || '';
}

/* ── Toast notification ── */
function showToast(message, type) {
  type = type || 'success';
  const toast = $('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';
  setTimeout(function () {
    toast.classList.remove('show');
  }, 4000);
}

/* =============================================
   PASSWORD TOGGLE
   ============================================= */
$('pwdToggle').addEventListener('click', function () {
  var input = $('password');
  var isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';

  var eyeIcon = $('eyeIcon');
  if (isText) {
    /* Show eye (password hidden) */
    eyeIcon.innerHTML =
      '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>' +
      '<circle cx="12" cy="12" r="3"/>';
  } else {
    /* Show eye-off (password visible) */
    eyeIcon.innerHTML =
      '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8' +
      'a18.45 18.45 0 0 1 5.06-5.94"/>' +
      '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8' +
      'a18.5 18.5 0 0 1-2.16 3.19"/>' +
      '<line x1="1" y1="1" x2="23" y2="23"/>';
  }
});

/* =============================================
   PASSWORD STRENGTH METER
   ============================================= */
$('password').addEventListener('input', function (e) {
  var value = e.target.value;
  var score = 0;

  if (value.length >= 6)                        score++; // min length
  if (value.length >= 10)                       score++; // longer
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++; // mixed case
  if (/[^A-Za-z0-9]/.test(value))              score++; // special char

  var colorMap = {
    1: 'fill-weak',
    2: 'fill-fair',
    3: 'fill-good',
    4: 'fill-strong'
  };
  var fillClass = colorMap[score] || '';

  var segments = ['s1', 's2', 's3', 's4'];
  segments.forEach(function (id, index) {
    var seg = $(id);
    seg.className = 'strength-seg';
    if (index < score) {
      seg.classList.add(fillClass);
    }
  });
});

/* =============================================
   VALIDATION RULES
   ============================================= */
var validators = {
  name: function (value) {
    if (value.trim().length < 2) {
      return 'Full name is required (min. 2 characters).';
    }
    return '';
  },
  email: function (value) {
    var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!pattern.test(value.trim())) {
      return 'Enter a valid email address.';
    }
    return '';
  },
  password: function (value) {
    if (value.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    return '';
  },
  phone: function (value) {
    if (!/^\d{7,15}$/.test(value.trim())) {
      return 'Phone must contain digits only (7–15 digits).';
    }
    return '';
  }
};

/* =============================================
   REAL-TIME BLUR VALIDATION
   ============================================= */
var fieldMap = [
  { inputId: 'fullname', key: 'name'     },
  { inputId: 'email',    key: 'email'    },
  { inputId: 'password', key: 'password' },
  { inputId: 'phone',    key: 'phone'    }
];

fieldMap.forEach(function (item) {
  $(item.inputId).addEventListener('blur', function () {
    var error = validators[item.key](this.value);
    if (error) {
      setField(item.key, 'error', error);
    } else {
      /* Show checkmark for all fields except password (has strength bar instead) */
      var msg = item.key === 'password' ? '' : '✓';
      setField(item.key, 'valid', msg);
    }
  });
});

/* =============================================
   FORM SUBMIT
   ============================================= */
$('regForm').addEventListener('submit', function (e) {
  e.preventDefault();

  var fields = {
    name:     $('fullname').value,
    email:    $('email').value,
    password: $('password').value,
    phone:    $('phone').value
  };

  /* --- Run all validators --- */
  var hasError = false;
  var keys = Object.keys(fields);

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var error = validators[key](fields[key]);
    if (error) {
      setField(key, 'error', error);
      hasError = true;
    }
  }

  if (hasError) return;

  /* --- Show loading state --- */
  var btn = $('submitBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  /* --- Send to backend --- */
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  })
    .then(function (res) {
      return res.json().then(function (data) {
        return { status: res.status, ok: res.ok, data: data };
      });
    })
    .then(function (response) {
      if (response.ok) {
        /* ── Success ── */
        showToast('🎉 Account created successfully!', 'success');
        $('regForm').reset();

        /* Clear all field states */
        ['name', 'email', 'password', 'phone'].forEach(function (k) {
          setField(k, '', '');
        });

        /* Reset strength bar */
        ['s1', 's2', 's3', 's4'].forEach(function (id) {
          $(id).className = 'strength-seg';
        });

      } else {
        /* ── Server validation errors ── */
        if (response.data.errors) {
          response.data.errors.forEach(function (err) {
            setField(err.field, 'error', err.message);
          });
        }
        showToast(response.data.message || 'Registration failed.', 'error');
      }
    })
    .catch(function () {
      showToast('Cannot reach server. Is it running on port 3000?', 'error');
    })
    .finally(function () {
      btn.classList.remove('loading');
      btn.disabled = false;
    });
});