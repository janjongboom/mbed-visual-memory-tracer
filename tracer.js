const TracerSerialDevice = require('./tracer-serial-device');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const hbs = require('hbs');
const promisify = require('es6-promisify').promisify;

hbs.registerPartials(__dirname + '/views/partials');
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.engine('html', hbs.__express);

const CON_PR = '\x1b[32m[TRCR]\x1b[0m';

(async function() {
    let device;

    try {
        function getAllPointersByCount() {
            if (!device) return {};
            let ptrs = device.getActivePointers();
            return Object.keys(ptrs).reduce((curr, p) => {
                if (!curr[ptrs[p].loc]) {
                    curr[ptrs[p].loc] = { count: 0, size: ptrs[p].size };
                }
                curr[ptrs[p].loc].count++;

                return curr;
            }, {});
        }

        // make sure to deinit() when quit'ing this process
        let quitImmediately = false;
        let sigintHandler;
        process.on('SIGINT', sigintHandler = async function(err) {
            if (err) console.error(err);
            if (quitImmediately) process.exit(1);

            try {
                if (device) {
                    console.log(CON_PR, getAllPointersByCount());
                    await device.deinit();
                }
            } catch (ex) {}
            process.exit(1);
        });
        process.on('uncaughtException', sigintHandler);
        process.on('unhandledRejection', sigintHandler);

        let path = '/dev/tty.usbmodem1462';
        let baud = 115200;

        console.log(CON_PR, 'Connecting to', path, baud);
        device = new TracerSerialDevice(path, baud);
        await device.init();
        console.log(CON_PR, 'Connected');

        await promisify(server.listen.bind(server))(process.env.PORT || 5199, process.env.HOST || '0.0.0.0');
        console.log(CON_PR, 'Server listening on port ' + (process.env.PORT || 5199));

        device.on('init', () => {
            console.log(CON_PR, 'Initialized', device.allocs);

            io.sockets.emit('init', {
                allocated: device.allocated,
                reserved: device.reserved
            });

            device.on('malloc', data => io.sockets.emit('malloc', data));
            device.on('calloc', data => io.sockets.emit('calloc', data));
            device.on('realloc', data => io.sockets.emit('realloc', data));
            device.on('free', data => io.sockets.emit('free', data));
        });

        device.on('data', data => {
            console.log(CON_PR, 'LOG', data.toString('utf-8'));

            io.sockets.emit('data', data.toString('utf-8'));
        });

        app.get('/', (req, res, next) => {
            res.render('index', { path: path, baud: baud });
        });
    }
    catch (ex) {
        console.error('Error', ex);
    }
})();
