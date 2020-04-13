#!/bin/bash
# start abtworld
killall /usr/bin/node
yarn start

# disable port redirect
# sudo iptables -t nat -D PREROUTING 1
# sudo iptables -t nat -D PREROUTING 2
# sudo iptables -t nat -D PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3030

# start nginx
sudo killall nginx
sudo cp -f ./nginx/nginx.conf /usr/local/nginx/conf/
sudo /usr/local/nginx/sbin/nginx -c /usr/local/nginx/conf/nginx.conf

#start tbawool
#cd ~/tbawool
#for((i=1;i<=12;i++));
#do
#let tbawoolport=3030;
#let tbawoolport+=$i;
#echo $tbawoolport
#cd tbawool${tbawoolport}
#pwd
#yarn start
#cd ../
#done
#cd ~/charging-block
#yarn start
#cd ~/abtworld

#start dapp data sync backgroud task
killall dapp_sync.sh
./dapp_sync.sh > /dev/null 2>&1 &
