#!/bin/bash
sudo apt install mongodb
sudo apt install graphicsmagick
yarn

#install patches
sudo cp -f ./patch/highlight/atom-one-dark.css ./node_modules/highlight.js/styles/
sudo cp -f ./patch/html2canvas/html2canvas.js ./node_modules/html2canvas/dist/
sudo chmod 777 -R ./node_modules
