# How to play
1. For Production game: https://sourabhsaha94.github.io/phaser-tutorial/
2. For Beta environment: https://sourabhsaha94.github.io/phaser-tutorial-beta/

# How to run the code
1. Run `python -m SimpleHTTPServer` from the source directory where `index.html` is present
2. Make code changes and reload the browser to see changes reflected

# Development best practice
1. Have the beta and production remote repositories added to git
    - `git remote add origin https://sourabhsaha94.github.io/phaser-tutorial/`
    - `git remote add beta https://sourabhsaha94.github.io/phaser-tutorial-beta/`
2. First push to beta by `git push beta <local-branch>:master`
3. After testing, push to production by `git push origin <local-branch>:master`
4. Always work from a branch <b>other</b> than master branch
