// Firebase initialization and helper functions
// IMPORTANT: Replace the firebaseConfig object with your Firebase project credentials.

(function () {
    // Placeholder config - replace with your project's config from Firebase Console
    const firebaseConfig = {
        apiKey: "AIzaSyBR6lwaOYLD6_KaFw2ADEUHjWN3IE0WUPY",
        authDomain: "cheptalal-secondary-school.firebaseapp.com",
        databaseURL: "https://cheptalal-secondary-school-default-rtdb.firebaseio.com",
        projectId: "cheptalal-secondary-school",
        storageBucket: "cheptalal-secondary-school.firebasestorage.app",
        messagingSenderId: "398792738071",
        appId: "1:398792738071:web:c36510ce5fae5fb1c2a352",
        measurementId: "G-HWE2K9WVGD"
    };

    function isFirebaseConfigured(config) {
        return config.apiKey && config.apiKey !== 'YOUR_API_KEY' &&
            config.authDomain && config.authDomain !== 'YOUR_PROJECT_ID.firebaseapp.com' &&
            config.databaseURL && config.databaseURL !== 'https://YOUR_PROJECT_ID.firebaseio.com' &&
            config.projectId && config.projectId !== 'YOUR_PROJECT_ID' &&
            config.appId && config.appId !== 'APP_ID';
    }

    // Mark Firebase as ready
    window.firebaseReady = false;

    // Initialize Firebase
    try {
        if (!isFirebaseConfigured(firebaseConfig)) {
            console.warn('Firebase is not configured. Please replace the placeholder values in js/firebase-init.js with your Firebase project credentials.');
        } else if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            window.firebaseReady = true;
            console.log('✓ Firebase initialized successfully', firebaseConfig.projectId);
        }
    } catch (err) {
        console.warn('Firebase initialization error:', err);
    }

    const dbRef = () => firebase.database().ref('galleryPhotos');

    window.savePhotoToFirebase = function (photoData) {
        if (!window.firebase || !isFirebaseConfigured(firebaseConfig)) {
            console.warn('Firebase not ready for save');
            return Promise.reject(new Error('Firebase is not configured or not loaded'));
        }
        console.log('Saving to Firebase:', photoData);
        return dbRef().push(photoData).then(ref => {
            console.log('Photo saved to Firebase:', ref.key);
            return ref;
        });
    };

    window.onGalleryUpdate = function (callback) {
        if (!window.firebase || !isFirebaseConfigured(firebaseConfig)) {
            console.warn('Firebase not ready for gallery update listener');
            return;
        }
        console.log('Attaching Firebase gallery listener...');
        dbRef().on('value', snapshot => {
            const val = snapshot.val() || {};
            const arr = Object.keys(val).map(k => ({ id: k, ...val[k] }));
            console.log('Firebase gallery updated with', arr.length, 'photos');
            callback(arr);
        }, (err) => {
            console.error('Firebase gallery listener error:', err);
        });
    };

    window.deletePhotoFromFirebase = function (photoId) {
        if (!window.firebase || !isFirebaseConfigured(firebaseConfig)) {
            console.warn('Firebase not ready for deletion');
            return Promise.reject(new Error('Firebase is not configured or not loaded'));
        }
        console.log('Deleting photo from Firebase:', photoId);
        return dbRef().child(photoId).remove().then(() => {
            console.log('✓ Photo deleted from Firebase successfully');
        }).catch(err => {
            console.error('✗ Firebase deletion error:', err);
            throw err;
        });
    };
})();
