#!/bin/bash

# 封装检查 Docker 登录的函数
check_docker_login() {
  # 指定的用户名
  SPECIFIED_USERNAME="slowcom_push@cnslowcom"

  # 获取当前登录的用户名
  get_docker_username() {
    if [ -f ~/.docker/config.json ]; then
      AUTH=$(jq -r '.auths["https://index.docker.io/v1/"].auth' ~/.docker/config.json 2>/dev/null)
      if [ "$AUTH" != "null" ] && [ -n "$AUTH" ]; then
        echo "$AUTH" | base64 --decode | cut -d ':' -f 1
      else
        echo ""
      fi
    else
      echo ""
    fi
  }

  # 获取当前登录的用户名
  CURRENT_USERNAME=$(get_docker_username)

  # 检查用户名是否匹配
  if [ "$CURRENT_USERNAME" != "$SPECIFIED_USERNAME" ]; then
    echo "当前登录的用户名为: $CURRENT_USERNAME，与指定的用户名 ($SPECIFIED_USERNAME) 不匹配。"
    echo "正在重新登录..."

    # 重新登录
    docker login --username=$SPECIFIED_USERNAME registry.cn-shenzhen.aliyuncs.com -p 'YUB)PWEjsdwnx)j3tcS&Fxjtwid9AiFT'
    echo "登录成功，当前用户名为: $CURRENT_USERNAME"
  else
    echo "当前登录的用户名为: $CURRENT_USERNAME，与指定的用户名匹配。"
  fi
}

check_docker_login
