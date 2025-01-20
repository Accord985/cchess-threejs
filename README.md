# Chinese Chess based on Three.js
## Introduction
Coming soon ... :P

## Project Structure
??

## How to play
If you want a quick demo, you can check it out here: [accord985.github.io](https://accord985.github.io). However, this demo site might not be the most updated version.
Or you can clone the project

Not going to use nodemon anymore because it does not help with scaling the project
with packages. Three.js module will not import properly if I host it simply with
nodemon. Therefore, I will use a more powerful building tool `Vite`.
It integrates all js files into a single one and I always have the correct
reference. Use `npm run dev` to start a test server. (The command is in `package.json`). `npm run build` is for compiling the files into production version. `npm run preview` previews the compiled result.
