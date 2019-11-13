#!/bin/bash
#restore backgroud requirement
# 1. mongo
# 2. use admin
# 3. db.auth('admin', '123456')
# 4. db.grantRolesToUser( "admin" , [ { role: "restore", db: "admin" } ]); 
restore_dir=mongodb-backup-2019-11-13-15-47-37
if [ -f $restore_dir.tar.gz ]
then
  sudo tar -xzvf ${restore_dir}.tar.gz
  sudo mongorestore -u admin -p 123456 ./$restore_dir
  sudo rm -rf $restore_dir
else
  echo ${restore_dir}.tar.gz not exist
fi
