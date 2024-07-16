##############
# playwright #
##############
FROM node:21 AS playwright

RUN corepack enable

# install playwright chromium and its required system dependencies. dependencies are installed first
# as they're the least likely to change.
#
# note: if the dependencies aren't installed, you get an ENOENT when playwright tries to launch
# chromium. this ends up confusing you, because the actual chromium binary is *right there*. but
# really, it's an ENOENT for a shared lib it can't find.
USER root
RUN pnpx playwright install-deps chromium
USER node
RUN pnpx playwright install chromium

#######
# dev #
#######
FROM playwright AS dev
WORKDIR /home/node/dev/
