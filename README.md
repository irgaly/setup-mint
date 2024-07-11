# setup-mint

A Github Action to install [Mint](https://github.com/yonaskolb/Mint), a swift package manager.

This action supports:

* detect Mintfile and run mint bootstrap
* cache mint binary and swift commands that installed by mint

## Usage

Add mint version to Mintfile (optional)

`Mintfile`

```
yonaskolb/mint@0.17.0
```

Use this action in a workflow.

```yml
    - uses: irgaly/setup-mint@v1
```

## setup-mint step details

setup-mint step will do:

* Retrieve mint version from Mintfile
  * Use mint@master if mint version is not specified in Mintfile
* Install mint to /usr/local/bin/mint
* Cache mint binary for next run
* Run `mint bootstrap` to install swift commands
* Cleanup unused swift commands (not listed in Mintfile)
* Cache swift commands for next run

## Platform

This action can be used in a macOS runner and a Linux runner.

## All Options

```yml
    - uses: irgaly/setup-mint@v1
      with:
        # a directory contains Mintfile, default: GITHUB_WORKSPACE
        mint-directory: .
        # a directory where mint executable itself will be installed, default: /usr/local/bin
        mint-executable-directory: /usr/local/bin
        # run mint bootstrap, default: true
        bootstrap: true
        # cache swift commands (~/.mint), default: true
        use-cache: true
        # cache key prefix for mint binary cache and swift commands cache, default: ""
        cache-prefix: ""
        # cleanup unused swift commands (not listed in Mintfile), default: true
        clean: true
```
