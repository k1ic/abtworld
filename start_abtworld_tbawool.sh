#!/bin/bash
killall /usr/bin/node
yarn start
cd ~/tbawool
for((i=1;i<=12;i++));
do
let tbawoolport=3030;
let tbawoolport+=$i;
echo $tbawoolport
cd tbawool${tbawoolport}
pwd
yarn start
cd ../
done
cd ~/charging-block
yarn start
cd ~/abtworld
