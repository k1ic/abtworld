#!/bin/bash

while [ 1 ]
do
  sleep 120
  echo 'start data sync'
  node tools/dapp_db_sync.js
  echo 'end data sync'
done
