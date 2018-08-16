const TracerSerialDevice = require('./tracer-serial-device');

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
                    console.log(getAllPointersByCount());
                    await device.deinit();
                }
            } catch (ex) {}
            process.exit(1);
        });
        process.on('uncaughtException', sigintHandler);
        process.on('unhandledRejection', sigintHandler);

        let path = '/dev/tty.usbmodem1462';
        let baud = 115200;

        console.log('Connecting to', path, baud);
        device = new TracerSerialDevice(path, baud);
        await device.init();
        console.log('Connected');

        device.on('init', () => {
            console.log('Initialized');
        });

        let hz = setInterval(() => {
            console.log('Heap size', device.allocated);
        }, 1000);

        let first = true;

        device.on('data', data => {
            console.log('LOG', data.toString('utf-8'));

            if (data.toString('utf-8').indexOf('Error') > -1 && first) {
                first = false;

                console.log(getAllPointersByCount());
                clearInterval(hz);
            }
        });
    }
    catch (ex) {
        console.error('Error', ex);
    }
})();
