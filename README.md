# SiYuan Secure Notes Plugin

[中文版](./README_zh_CN.md)

## Overview

The SiYuan Secure Notes Plugin enhances your SiYuan experience by allowing you to set passwords for Notebooks. The user is required to enter the password before seeing the content.
The functionality is inspired by the plugin [SiYuan Access Controller](https://github.com/kuangdongksk/siyuan-access-controller/blob/main/README.md). My motivation to create my own plugin is rooted in a more secure approach with flexible settings.

## Features

- Protect Notebooks with a password
- Provide a setting which allows if you want to hide or blur the protected notebooks
- Provide a setting if uninstalling the plugin should remove the stored passwords
- Passwords are encrypted

## Data Security Statement

Out of absolute importance to data security, this plugin hereby declares that all APIs used by the plugin, and the code is completely open source (uncompiled and not confuscated), everyone is welcome to report security issues.

This plugin depends on the following APIs:

- `/api/file/getFile` and `/api/file/putFile`: These endpoints are used to store which notebooks are protected by which password, and the plugin settings

## Plugin permissions

The plugin does not change any existing data, the security information is stored in separate configuration.

## Support & Feedback

Please use Github issues to submit bugs or request features.
