# v1.6.0 - 2024/07/12 JST

Revert v1.5.0's breaking change: $HOME/bin/mint -> /usr/local/bin/mint

#### Fix

* Add mint-executable-directory option to mint installation directory [#28](https://github.com/irgaly/setup-mint/pull/28)
    * mint will be install to /usr/local/bin/mint
    * add `mint-executable-directory` option

# v1.5.0 - 2024/07/06 JST

#### Improve

* put mint executable to $HOME/bin/mint [#24](https://github.com/irgaly/setup-mint/pull/24)
* fix use $HOME/bin/mint [#25](https://github.com/irgaly/setup-mint/pull/25)

# v1.4.0 - 2024/04/06 JST

#### Improve

* fix: gracefully handle race condition between parallel builds [#10](https://github.com/irgaly/setup-mint/pull/10)

#### Maintenance

* Update npm libraries [#12](https://github.com/irgaly/setup-mint/pull/12)

# v1.3.0 - 2023/11/19 JST

#### Improve

* Support M1 Mac Runner / Arm64 [#8](https://github.com/irgaly/setup-mint/pull/8)

# v1.2.0 - 2023/09/11 JST

#### Maintenance

* Update node20 [#6](https://github.com/irgaly/setup-mint/pull/6)

# v1.1.1 - 2022/12/28 JST

#### Fix

* fix MINT_PATH shell tilde expansion [#4](https://github.com/irgaly/setup-mint/pull/5)

# v1.1.0 - 2022/12/23 JST

#### Improve

* support MINT_PATH, MINT_LINK_PATH environments [#4](https://github.com/irgaly/setup-mint/pull/4)

# v1.0.1 - 2022/12/06 JST

#### Maintenance

* Use node 16 for action run [#1](https://github.com/irgaly/setup-mint/pull/1)

# v1.0.0 - 2022/02/19 JST

Initial release.
