#!/bin/bash
while [[ $# > 1 ]]
do
key="$1"
echo $1
case $key in
    -c|--config)
    CONFIG_FILE="$2"
    shift
    ;;
    --default)
    DEFAULT=YES
    shift
    ;;
    *)
    ;;
esac
shift
done

if [[ -z ${CONFIG_FILE} ]];then
  exit 1;
fi

# Read config file
source ${CONFIG_FILE}

# Change directory to repo
cd ${GIT_REPO}

# Prepare Git and commit file
GIT_ORIGIN="https://${GIT_USERNAME}:${GIT_TOKEN}@github.com/${GIT_REPO_REMOTE}"

git config user.name ${GIT_USER}
git config user.email ${GIT_EMAIL}

cd _site
git pull ${GIT_ORIGIN} master

cd ..

git pull ${GIT_ORIGIN} source
jekyll build >> ~/logs/commit_build.log

cd _site

git add .
git commit -m "${GIT_COMMIT_MESSAGE}"
git push ${GIT_ORIGIN} master
