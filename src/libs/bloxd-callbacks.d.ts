declare let tick: (ms: number) => void;

declare let onClose: (serverIsShuttingDown: boolean) => void;

declare let onPlayerJoin: (playerId: BloxdTypes.PlayerId, fromGameReset: boolean) => void;

declare let onPlayerLeave: (playerId: BloxdTypes.PlayerId, serverIsShuttingDown: boolean) => void;

declare let onPlayerJump: (playerId: BloxdTypes.PlayerId) => void;

declare let onRespawnRequest: (playerId: BloxdTypes.PlayerId) => void;

declare let playerCommand: (playerId: BloxdTypes.PlayerId, command: string) => false | boolean;

declare let onPlayerChat: (playerId: BloxdTypes.PlayerId, chatMessage: string, channelName: string) => true | boolean;