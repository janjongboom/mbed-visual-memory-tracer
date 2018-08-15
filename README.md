# Visual Memory Tracer for Mbed OS

Work in progress.

## Enable your application

Your application needs memory tracing enabled. To enable this in your application:

1. Set a high serial baud rate to avoid a large slowdown in your application.
1. Enable the following macros in your `mbed_app.json`:

    ```json
    {
        "macros": [
            "MBED_MEM_TRACING_ENABLED",
            "MBED_HEAP_STATS_ENABLED=1"
        ]
    }
    ```

1. Add a marker to show when the application restarts. This is the initialisation code for the tracer, which shows the current available heap usage. As the first line of your application, add:

    ```cpp
    #include "mbed.h"
    #include "mbed_mem_trace.h"

    int main() {
        mbed_stats_heap_t heap_stats;
        mbed_stats_heap_get(&heap_stats);

        printf("#visual-memory-tracer-init:%lu:%lu\r\n", heap_stats.current_size, heap_stats.reserved_size);
        mbed_mem_trace_set_callback(mbed_mem_trace_default_callback);

        // ... rest of your application
    ```

Preferably use a separate UART port for the trace information.

## Run the tracer

Set your serial port and baud rate in `tracer.js`, then run:

1. `npm install`
1. `node tracer.js`

To get the symbols from your application, run `arm-none-eabi-objdump -S path/to/your.elf`. Will automate this in the future.
