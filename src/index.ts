import joplin from 'api';

joplin.plugins.register({
    onStart: async function () {
        let startTime = +new Date();
        let checkTimer = null;

        // 5000 s，read from setting
        const gup = 3000;

        let lockDialog;
        let lockResult;

        const lock = async () => {
            if (!lockDialog) {
                lockDialog = await joplin.views.dialogs.create('app.locker');

                await joplin.views.dialogs.setHtml(
                    lockDialog,
                    `
                <form name="app.locker">
                    Password: <input type="password" name="password"/>
                </form>
                `
                );
                await joplin.views.dialogs.setButtons(lockDialog, [
                    {
                        id: 'unlock',
                        title: 'Unlock',
                        onClick() {
                            console.log('lockDialog', lockDialog, lockResult);
                        },
                    },
                ]);
            }

            if (!lockResult) {
                lockResult = await joplin.views.dialogs.open(lockDialog);
            }
        };

        // check app is idle or not
        const checkIdle = () => {
            const now = +new Date();

            checkTimer = setTimeout(() => {
                console.log(111);

                if (now - startTime > gup) {
                    lock();
                    console.log(222, 'locked');
                    clearTimeout(checkTimer);
                } else {
                    checkIdle();
                }
            }, 3000);
        };

        // when note changed, recheck app status
        joplin.workspace.onNoteChange(() => {
            startTime = +new Date();
            clearTimeout(checkTimer);
            checkIdle();
        });

        checkIdle();
    },
});
