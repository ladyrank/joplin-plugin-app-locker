import joplin from 'api';
import { SettingItemType } from 'api/types';

joplin.plugins.register({
    onStart: async function () {
        // insert app locker setting
        await joplin.settings.registerSection('appLocker', {
            label: 'App Locker',
            iconName: 'fa fa-lock',
        });
        // insert app locker setting
        await joplin.settings.registerSettings({
            appLockerPswd: {
                value: '',
                type: SettingItemType.String,
                section: 'appLocker',
                public: true,
                secure: true,
                label: 'Password (If password is empty, plugin app locker will not work.): ',
            },
            appLockerTimer: {
                value: 5,
                type: SettingItemType.Int,
                section: 'appLocker',
                public: true,
                label: 'Lock joplin when it has no activity for how many minutes (Default is 5 minutes, value must be integer and greater than 0.): ',
            },
        });

        let startTime = +new Date();
        let checkTimer = null;
        let lockId = null;

        // relock
        const resetLock = (status, pswd) => {
            lock(status, pswd);
            clearTimeout(checkTimer);
        };

        // lock app
        const lock = async (wrong, pswd) => {
            const Dialogs = joplin.views.dialogs;
            let lockResult;

            if ((lockResult && lockResult?.formData?.appLocker) || lockId) {
                return false;
            }

            lockId = 'app.locker' + +new Date();
            const lockDialog = await Dialogs.create(lockId);

            await Dialogs.setHtml(
                lockDialog,
                `<form style="margin: 100px auto; text-align: center; font-size: 16px;" name="appLocker">
                    <p>${
                        wrong
                            ? '<span style="color: red;">Password is wrong.</span> '
                            : ''
                    }Please enter unlock password:</p>
            		<input type="password" name="password"/>
            	</form>`
            );
            await Dialogs.setButtons(lockDialog, [
                { id: 'submit', title: 'Unlock' },
            ]);
            await Dialogs.setFitToContent(lockDialog, false);

            lockResult = await Dialogs.open(lockDialog);

            if (lockResult?.formData?.appLocker?.password !== pswd) {
                lockId = null;
                resetLock(true, pswd);
            } else {
                lockId = null;
                startTime = +new Date();
                clearTimeout(checkTimer);
                checkIdle(false);
            }
        };

        // check app is idle or not
        const checkIdle = async (actNow) => {
            const lockTimer = parseInt(
                (await joplin.settings.value('appLockerTimer')) || '5'
            );
            const pswd = (
                (await joplin.settings.value('appLockerPswd')) || ''
            ).trim();

            if (actNow) {
                resetLock(null, pswd);
                return false;
            }

            if (lockTimer > 0 && pswd) {
                const now = +new Date();
                const checkTime = (lockTimer - 1) * 60 * 1000 + 60 * 1000;

                // console.log(
                //     [
                //         lockTimer,
                //         pswd,
                //         now - startTime,
                //         new Date(startTime),
                //         'checking joplin idle status',
                //     ].join(',')
                // );

                clearTimeout(checkTimer);
                checkTimer = setTimeout(() => {
                    if (now - startTime + checkTime > lockTimer * 60 * 1000) {
                        resetLock(null, pswd);
                    } else {
                        checkIdle(false);
                    }
                }, checkTime);
            }
        };

        // when note changed, check app status again
        joplin.workspace.onNoteChange(() => {
            startTime = +new Date();
            clearTimeout(checkTimer);
            checkIdle(false);
        });

        checkIdle(true);
    },
});
