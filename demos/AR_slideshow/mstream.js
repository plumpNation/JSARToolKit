var threshold  = 128,
    DEBUG      = false,
    photos     = [],
    mainWidth  = 640,
    mainHeight = 480,
    video;

getPhotos('photos2.xml', function () {
    var ps = this.responseText
        .match(/http:\/\/[a-z0-9_\/\.]+_m.jpg/g)
        .sort()
        .unique()
        .map(function (u) { return u.replace(/m\.jpg$/, 'z.jpg') });

    photos = ps
        .map(function (u) { return u.replace(/.*\/([^\/]+)$/, '$1') })
        .map(Image.load);

});

video = createVideo(document, {
    'src'   : 'swap_loop.ogg',
    'width' : mainWidth,
    'height': mainHeight
});

video.style.display = 'none';

/*
navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);

navigator.webkitGetUserMedia({'video': true},
    function (stream) {
        var url = webkitURL.createObjectURL(stream);
        video.src = url;
    },
    function (error) { alert('you got no WebRTC webcam'); }
);*/

video.src = 'swap_loop.ogg';

window.onload = function () {
    var canvas,
        videoCanvas,
        raster,
        param,
        resultMat,
        detector,
        ctx,
        glCanvas,
        videoTex,
        s,
        times       = [],
        pastResults = {},
        lastTime    = 0,
        cubes       = {},
        images      = [];

    byId('loading').style.display = 'none';

    document.body.appendChild(video);

    canvas               = document.createElement('canvas');
    canvas.width         = mainWidth;
    canvas.height        = mainHeight;
    canvas.style.display = 'block';

    videoCanvas          = document.createElement('canvas');
    videoCanvas.width    = video.width;
    videoCanvas.height   = video.height;

    raster               = new NyARRgbRaster_Canvas2D(canvas);
    param                = new FLARParam(mainWidth,mainHeight);

    resultMat            = new NyARTransMatResult();
    detector             = new FLARMultiIdMarkerDetector(param, 80);

    detector.setContinueMode(true);

    ctx                  = canvas.getContext('2d');
    ctx.font             = '24px URW Gothic L, Arial, Sans-serif';

    glCanvas             = document.createElement('canvas');
    glCanvas.width       = 960;
    glCanvas.height      = 720;

    s = glCanvas.style;

    document.body.appendChild(glCanvas);

    display = new Magi.Scene(glCanvas);
    display.drawOnlyWhenChanged = true;

    param.copyCameraMatrix(display.camera.perspectiveMatrix, 10, 10000);
    display.camera.useProjectionMatrix = true;

    videoTex                                            = new Magi.FlipFilterQuad();
    videoTex.material.textures.Texture0                 = new Magi.Texture();
    videoTex.material.textures.Texture0.image           = videoCanvas;
    videoTex.material.textures.Texture0.generateMipmaps = false;

    display.scene.appendChild(videoTex);

    window.updateImage = function () {
        display.changed = true;
    }

    window.addEventListener('keydown', function (event) {
        if (Key.match(event, Key.LEFT)) {
            images.forEach(function (e) { e.setImage(photos.rotate(true)); });

        } else if (Key.match(event, Key.RIGHT)) {
            images.forEach(function (e) { e.setImage(photos.rotate(false)); });
        }
    }, false);

    window.setInterval(function () {
        // If video has ended, start playing from beginning, (not for webcam of course).
        if (video.ended) video.play();

        // If paused do nothing
        if (video.paused) return;
        if (window.paused) return;

        // If video playhead is at the end of the video, set the playhead to the start of
        // the video again, i.e. another loop.
        if (video.currentTime == video.duration) {
            video.currentTime = 0;
        }

        // If video playhead has not progressed since the last interval...
        if (video.currentTime == lastTime) return;

        lastTime = video.currentTime;

        videoCanvas.getContext('2d').drawImage(video,0,0);
        ctx.drawImage(videoCanvas, 0, 0, mainWidth, mainHeight);

        var dt = new Date().getTime();

        videoTex.material.textures.Texture0.changed = true;
        canvas.changed                              = true;
        display.changed                             = true;

        var t = new Date();
        var detected = detector.detectMarkerLite(raster, threshold);

        console.log(detected);

        for (var idx = 0; idx < detected; idx += 1) {
            var id = detector.getIdMarkerData(idx);
            // read data from i_code via Marsial--Marshal経由で読み出す
            var currId;

            if (id.packetLength > 4) {
                currId = -1;

            } else {
                currId = 0;
                for (var i = 0; i < id.packetLength; i += 1) {
                    currId = (currId << 8) | id.getPacketData(i);
                    //console.log('id[', i, ']=', id.getPacketData(i));
                }
            }

            //console.log('[add] : ID = ' + currId);
            if (!pastResults[currId]) {
                pastResults[currId] = {};
            }
            detector.getTransformMatrix(idx, resultMat);
            pastResults[currId].age = 0;
            pastResults[currId].transform = Object.asCopy(resultMat);
        }

        for (var i in pastResults) {
            var r = pastResults[i];
            if (r.age > 1) {
                delete pastResults[i];
                cubes[i].image.setImage(photos.rotate());
            }
            r.age++;
        }

        for (var i in cubes) cubes[i].display = false;

        for (var i in pastResults) {
            if (!cubes[i]) {
                var pivot = new Magi.Node();

                pivot.transform = mat4.identity();
                pivot.setScale(80);

                var image = new Magi.Image();

                image
                    .setAlign(image.centerAlign, image.centerAlign)
                    .setPosition(0, 0, 0)
                    .setAxis(0,0,1)
                    .setAngle(Math.PI)
                    .setSize(1.5);

                image.setImage = function (src) {
                    var img = E.canvas(640,640);
                    Magi.Image.setImage.call(this, img);
                    this.texture.generateMipmaps = false;
                    var self = this;
                    src.onload = function () {
                        var w = this.width, h = this.height;
                        var f = Math.min(640/w, 640/h);
                        w = (w*f);
                        h = (h*f);
                        img.getContext('2d').drawImage(this, (640-w)/2,(640-h)/2,w,h);
                        self.texture.changed = true;
                        self.setSize(1.1*Math.max(w/h, h/w));
                    };

                    if (Object.isImageLoaded(src)) {
                        src.onload();
                    }
                };

                image.setImage(photos.rotate());
                images.push(image);
                pivot.image = image;
                pivot.appendChild(image);

                /*var txt = new Magi.Text(i);
                txt.setColor('#f0f0d8');
                txt.setFont('URW Gothic L, Arial, Sans-serif');
                txt.setFontSize(32);
                txt.setAlign(txt.leftAlign, txt.bottomAlign)
                    .setPosition(-0.45, -0.48, -0.51)
                    .setScale(1/190);*/

                display.scene.appendChild(pivot);
                cubes[i] = pivot;
            }

            cubes[i].display = true;

            var mat = pastResults[i].transform;
            var cm = cubes[i].transform;

            cm[0]  = mat.m00;
            cm[1]  = -mat.m10;
            cm[2]  = mat.m20;
            cm[3]  = 0;
            cm[4]  = mat.m01;
            cm[5]  = -mat.m11;
            cm[6]  = mat.m21;
            cm[7]  = 0;
            cm[8]  = -mat.m02;
            cm[9]  = mat.m12;
            cm[10] = -mat.m22;
            cm[11] = 0;
            cm[12] = mat.m03;
            cm[13] = -mat.m13;
            cm[14] = mat.m23;
            cm[15] = 1;
        }

    }, 15);
}
