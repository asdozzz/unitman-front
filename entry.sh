echo "window._env_ = {" > /usr/share/nginx/html/env-config.js
echo "  VITE_API_HOST: \"${VITE_API_HOST}\"" >> /usr/share/nginx/html/env-config.js
echo "  VITE_CENTRIFUGE_HOST: \"${VITE_CENTRIFUGE_HOST}\"" >> /usr/share/nginx/html/env-config.js
echo "};" >> /usr/share/nginx/html/env-config.js
