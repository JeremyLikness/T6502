# T6502

This is a migration from CodePlex of the original 6502 emulator I wrote using Angular and TypeScript. The more current versions include:

[6502 emulator](https://github.com/JeremyLikness/6502emulator) - a port of the existing (not all op codes are supported) 

[6502 emulator with Redux](https://github.com/JeremyLikness/redux6502) - work in progress (supports all op codes but UI implementation is not completed - much more comprehensive test suite)

The legacy documentation for this emulator: 

T6502 is a 6502 emulator written in TypeScript using AngularJS. The goal is well-organized, readable code over performance. This is a "fun" emulator I wrote to learn and demonstrate TypeScript and AngularJS. 

Try the latest version of the project online at:
[http://apps.jeremylikness.com/t6502/](http://apps.jeremylikness.com/t6502/)

You can run the full unit test suite at: 
[http://apps.jeremylikness.com/t6502/tests.htm](http://apps.jeremylikness.com/t6502/tests.htm)

Because the focus is clarity over speed, this is may be slower than other emulators you might find. That is on purpose. I'll continue to optimize where it doesn't compromise clarity of the codebase but overall this is designed to provide a demonstration of some great technologies and provide a sandbox for learning assembly code. 

How does the speed compare? The Commodore 64 in the U.S. ran at 1 MHz meaning it could handle 1,000,000 "cycles" per second. A cycle was a measurement for how long it took to run a single cycle instruction, but some instructions took 2 or 3 or more cycles. So let's assume an average of 3 cycles per instruction, and that would mean an average of about 333,333 instructions per second! Quite impressive considering how old the machine is.

The emulator on my Lenovo Yoga runs around 25,000 instructions per second. Not as fast as the original machine but still fast enough to create some impressive demos and have fun with the virtual machine.

Currently the emulator supports a limited set of op codes - I added a core needed to do the Sierpinski program and validate the display directive and palette, and will focus on writing the compiler next before I update the entire instruction set.. 

The emulator features a 32 x 32 display with 256 color palette and a built-in disassembler. 
