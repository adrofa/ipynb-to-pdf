#!/bin/bash

npx csso --input ./themes/foghorn.css --output themes/foghorn.css
npx csso --input ./themes/ghostwriter.css --output themes/ghostwriter.css
npx csso --input ./themes/github.css --output themes/github.css
npx csso --input ./themes/github-dark.css --output themes/github-dark.css
npx csso --input ./themes/godspeed.css --output themes/godspeed.css
npx csso --input ./themes/markdown5.css --output themes/markdown5.css
npx csso --input ./themes/markdown6.css --output themes/markdown6.css
npx csso --input ./themes/markdown7.css --output themes/markdown7.css
npx csso --input ./themes/markdown8.css --output themes/markdown8.css
npx csso --input ./themes/markdown9.css --output themes/markdown9.css
npx csso --input ./themes/markdown-alt.css --output themes/markdown-alt.css
npx csso --input ./themes/markdown.css --output themes/markdown.css
npx csso --input ./themes/markedapp-byword.css --output themes/markedapp-byword.css
npx csso --input ./themes/new-modern.css --output themes/new-modern.css
npx csso --input ./themes/radar.css --output themes/radar.css
npx csso --input ./themes/screen.css --output themes/screen.css
npx csso --input ./themes/solarized-dark.css --output themes/solarized-dark.css
npx csso --input ./themes/solarized-light.css --output themes/solarized-light.css
npx csso --input ./themes/torpedo.css --output themes/torpedo.css
npx csso --input ./themes/vostok.css --output themes/vostok.css
node build/themes/fix-github.js
