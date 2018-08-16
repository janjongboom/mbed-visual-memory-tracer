# Visual Memory Tracer for Mbed OS

Work in progress.

## Enable your application

Your application needs memory tracing enabled. To enable this in your application:

1. Set a high serial baud rate to avoid a large slowdown in your application.
1. Add the [visual memory tracer library](https://github.com/janjongboom/mbed-visual-memory-tracer-lib) to your project:

    ```
    $ mbed add https://github.com/janjongboom/mbed-visual-memory-tracer-lib
    ```

1. Enable the following macros in your `mbed_app.json`:

    ```json
    {
        "macros": [
            "MBED_MEM_TRACING_ENABLED",
            "MBED_HEAP_STATS_ENABLED=1"
        ]
    }
    ```

1. Initialize the tracer library by placing initialization code in *both* `mbed_main` and `main`:

    ```cpp
    #include "mbed.h"
    #include "mbed_vis_mem_tracer.h"

    extern "C" void mbed_main() {
        mbed_vismem_preinit();
    }

    int main() {
        mbed_vismem_init();

        // ... rest of your application
    }
    ```

Preferably use a separate UART port for the trace information.

## Run the tracer

Set your serial port and baud rate in `tracer.js`, then run:

1. `npm install`
1. `node tracer.js`

To get the symbols from your application, run `arm-none-eabi-objdump -S path/to/your.elf`. Will automate this in the future.
