FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    curl wget unzip xz-utils cmake ninja-build python3 \
    pkg-config git build-essential libssl-dev libffi-dev \
    patchelf file bc && \
    rm -rf /var/lib/apt/lists/*

# Android NDK r28b
RUN NDK_VERSION="r28b" && \
    cd /tmp && \
    wget -q "https://dl.google.com/android/repository/android-ndk-${NDK_VERSION}-linux.zip" -O ndk.zip && \
    unzip -q ndk.zip -d /opt/ && \
    mv "/opt/android-ndk-${NDK_VERSION}" "/opt/android-ndk" && \
    rm ndk.zip

ENV ANDROID_NDK_HOME=/opt/android-ndk
ENV NDK=/opt/android-ndk
ENV TOOLCHAIN_DIR=/opt/android-ndk/toolchains/llvm/prebuilt/linux-x86_64
ENV PATH="${TOOLCHAIN_DIR}/bin:${PATH}"
ENV AR="${TOOLCHAIN_DIR}/bin/llvm-ar"
ENV CC="${TOOLCHAIN_DIR}/bin/aarch64-linux-android24-clang"
ENV CXX="${TOOLCHAIN_DIR}/bin/aarch64-linux-android24-clang++"
ENV LD="${TOOLCHAIN_DIR}/bin/ld"
ENV STRIP="${TOOLCHAIN_DIR}/bin/llvm-strip"

WORKDIR /home/container
COPY scripts/build-on-pterodactyl.sh /build.sh
CMD ["bash", "/build.sh"]
