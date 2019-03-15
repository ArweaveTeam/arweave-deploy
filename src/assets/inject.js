<script>
    (()=>{
        const ws = new WebSocket('ws://localhost:1985');
        window.ws = ws;
        ws.onopen = () => {
            ws.onmessage = (wsMessage) => {
                const message = JSON.parse(wsMessage.data);
                console.log('ws:message', message);
                if (message.action == 'build.new') {
                    console.log('ws:reloading');
                    window.location.reload();
                }
            }
        };
    })();
</script>