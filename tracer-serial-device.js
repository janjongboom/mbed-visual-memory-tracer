const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const EventEmitter = require('events');
const promisify = require('es6-promisify').promisify;

const CON_PR = '[TRCR]';

// This connects to the proprietary device over serial port
class TracerSerialDevice extends EventEmitter {
    constructor(port, baudRate) {
        super();
        this.sp = new SerialPort(port, {
            baudRate: baudRate,
            autoOpen: false
        });
        this.allocs = {};
        this._allocated = 0;
        this._reserved = 0;
        this._initialized = false;
    }
    async init() {
        await promisify(this.sp.open.bind(this.sp))();
        this.parser = this.sp.pipe(new Readline({ delimiter: '\n' }));
        this.parser.on('data', this.onData.bind(this));
    }
    onData(data) {
        let l = data.toString('utf-8').trim();

        if (l[0] !== '#') return this.emit('data', data);

        if (l.indexOf('#visual-memory-tracer-init:') === 0) {
            console.log(CON_PR, 'Initialized');
            let [op, allocated, reserved] = l.split(/[\:;]/);
            this._allocated = Number(allocated);
            this._reserved = Number(reserved);
            this._initialized = true;
            this.emit('init');
        }

        if (!this._initialized) return;

        if (l.indexOf('#m:') === 0) {
            // malloc
            let [op, ptr, loc, size] = l.split(/[\:;-]/);
            size = Number(size);
            this.allocs[ptr] = { loc: loc, size: size };

            this._allocated += size;
        }
        else if (l.indexOf('#c:') === 0) {
            // calloc
            let [op, ptr, loc, size, items] = l.split(/[\:;-]/);
            size = Number(size);
            items = Number(items);
            this.allocs[ptr] = { loc: loc, size: size * items };

            this._allocated += size * items;
        }
        else if (l.indexOf('#f:') === 0) {
            // free
            let [op, ret, loc, ptr] = l.split(/[\:;-]/);
            if (this.allocs[ptr]) {
                this._allocated -= this.allocs[ptr].size;
                delete this.allocs[ptr];
            }
            else {
                // free on null pointer is valid
                if (ptr === '0x0') return;

                console.warn(CON_PR, 'Free for untracked pointer', ptr, l);
            }
        }
        else if (l.indexOf('#r:') === 0) {
            let [op, new_ptr, loc, old_ptr, size] = l.split(/[\:;-]/);
            size = Number(size);
            if (this.allocs[old_ptr]) {
                this._allocated -= this.allocs[old_ptr].size;
                delete this.allocs[old_ptr];
            }
            else {
                console.warn(CON_PR, 'Realloc for untracked pointer', old_ptr);
            }

            this.allocs[new_ptr] = { loc: loc, size: size };
            this._allocated += this.allocs[new_ptr].size;
        }
    }
    async deinit() {
        await promisify(this.sp.close.bind(this.sp))();
    }
    get allocated() {
        return this._allocated;
    }
    get reserved() {
        return this._reserved;
    }
    getActivePointers() {
        return this.allocs;
    }
}

module.exports = TracerSerialDevice;
