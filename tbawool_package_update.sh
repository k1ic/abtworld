#!/bin/bash
cd ~/tbawool
for((i=1;i<=11;i++));
do
let tbawoolport=3030;
let tbawoolport+=$i;
echo $tbawoolport
cd tbawool${tbawoolport}
pwd
cp -f ../cmn_src/package.json ./
yarn
cp -f ../cmn_src/atom-one-dark.css ./node_modules/highlight.js/styles/
yarn build 
cd ../
done
