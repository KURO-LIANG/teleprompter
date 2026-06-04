#!/bin/bash

# 镜像仓库地址
REGISTRY=registry.cn-shenzhen.aliyuncs.com
# 命名空间
NAMESPACE=slowcom
# 镜像名称
IMAGE_NAME=slowcom-teleprompter-ui

# 环境 beta prod
ENV=prod

# 检查 Docker 登录
#bash ./checkDockerLogin.sh

echo "正在编译发布代码..."
if [ "$ENV" = beta ]; then
  echo "正在编译beta环境代码..."
  npm run test
else
  echo "正在编译prod环境代码..."
    npm run build
fi
echo "编译发布代码完成！"
echo "正在推送镜像到镜像仓库..."

# 获取当前日期，格式为 YYYYMMDD
DATE=$(date +%Y%m%d)

# 设置存储次数的文件路径
COUNTER_FILE="./docker-push-counter.txt"

# 如果文件不存在，初始化为 0
if [ ! -f "$COUNTER_FILE" ]; then
  echo "0 $DATE" > "$COUNTER_FILE"
fi

# 读取当前的计数值和日期
read COUNTER LAST_DATE < "$COUNTER_FILE"

# 如果日期不一致，重置计数器为 1
if [ "$LAST_DATE" != "$DATE" ]; then
  COUNTER=1
else
  COUNTER=$((COUNTER + 1))
fi

# 生成版本号
VERSION="${DATE}.$(printf "%03d" $COUNTER).$ENV"

# 构建并推送 Docker 镜像
docker build -f Dockerfile -t $REGISTRY/$NAMESPACE/$IMAGE_NAME:$VERSION . && docker push $REGISTRY/$NAMESPACE/$IMAGE_NAME:$VERSION

# 更新计数器和日期
echo "$COUNTER $DATE" > "$COUNTER_FILE"
echo "推送镜像完成！生成的版本号:$VERSION"
