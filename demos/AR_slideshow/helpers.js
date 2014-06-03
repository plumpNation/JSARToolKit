var createVideo = function (document, options) {
        var video = document.createElement('video');

        video.width         = options.width || 640;
        video.height        = options.height || 480;
        video.loop          = options.loop || true;
        video.volume        = 0;
        video.autoplay      = true;
        video.controls      = true;

        if (options.src) {
            video.src = options.src;
        }

        return video;
    },

    getPhotos = function (url, callback) {
        var xhr = new XMLHttpRequest;

        xhr.open('GET', url, false);
        xhr.addEventListener('load', callback, false);
        xhr.send(null);
    },

    attachWebcamTo = function (videoElement, onSuccess, onFailure) {
        navigator.getUserMedia = ( navigator.getUserMedia ||
                               navigator.webkitGetUserMedia ||
                               navigator.mozGetUserMedia ||
                               navigator.msGetUserMedia);

        navigator.getUserMedia(
            {
                'video': true
            },
            function (stream) {
                var vendorURL = window.URL || window.webkitURL,
                    url       = webkitURL.createObjectURL(stream);

                videoElement.src = url;

                if (onSuccess) {
                    onSuccess();
                }
            },
            function (error) {
                console.info('you got no WebRTC webcam');

                if (onFailure) {
                    onFailure();
                }
            }
        );
    };
