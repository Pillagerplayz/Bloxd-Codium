declare global {
    type EntityId = number | string;
    type LifeformId = number | string;
    type PlayerId = number | string;
    type PlayerDbId = number | string;
    type PNull<T> = T | null;
    type PUndefined<T> = T | undefined;
    type PlayerBodyPart = "head" | "body" | "legs";
    type MeleeOverides = {
        damage?: PNull<number>,
        heldItemName?: PNull<string>,
        horizontalKbMultiplier?: number,
        verticalKbMultiplier?: number,
    };
    type PlayerAttemptDamageOtherPlayerOpts = {
        eId: LifeformId,
        hitEId: LifeformId,
        attemptedDmgAmt: number,
        bodyPartHit: PUndefined<PlayerBodyPart>,
        attackDir: PUndefined<number[]>,
        showCritParticles: boolean,
        reduceVerticalKbVelocity: boolean,
        horizontalKbMultiplier: number,
        verticalKbMultiplier: number,
        broadcastEntityHurt: boolean,
        attackCooldownSettings: PNull<object>,
        hittingSoundOverride: PNull<string>,
        ignoreOtherEntitySettingCanAttack: boolean,
        isTrueDamage: boolean,
        damagerDbId: PNull<PlayerDbId>
    };
    type Song =
        | "Awkward Comedy Quirky"
        | "battle-ship-111902"
        | "cdk-Silence-Await"
        | "corsairs-studiokolomna-main-version-23542-02-33"
        | "ghost-Reverie-small-theme"
        | "happy"
        | "Heroic-Demise-New"
        | "I-am-the-Sea-Room-4"
        | "progress"
        | "raise-the-sails-152124"
        | "ramblinglibrarian-I-Have-Often-T"
        | "Slow-Motion-Bensound"
        | "snowflake-Ethereal-Space"
        | "the-epic-adventure-131399"
        | "The Suspense Ambient"
        | "TownTheme"
        | "LonePeakMusic-Highway-1"
        | "Adigold - A Place To Be Free"
        | "Adigold - Butterfly Effect"
        | "Adigold - Dreamless Sleep"
        | "Adigold - Frozen Pulse"
        | "Adigold - Frozen Skies"
        | "Adigold - Healing Thoughts"
        | "Adigold - Here Forever"
        | "Adigold - Just a Little Hope"
        | "Adigold - Just Like Heaven"
        | "Adigold - Memories Remain"
        | "Adigold - Place To Be"
        | "Adigold - The Riverside"
        | "Adigold - The Wonder"
        | "Adigold - Vetrar (Cut B)"
        | "Juhani Junkala [Retro Game Music Pack] Ending"
        | "Juhani Junkala [Retro Game Music Pack] Level 1"
        | "Juhani Junkala [Retro Game Music Pack] Level 2"
        | "Juhani Junkala [Retro Game Music Pack] Level 3"
        | "Juhani Junkala [Retro Game Music Pack] Title Screen"
        | "Mojo Productions - Pirates"
        | "Mojo Productions - Sneaky Jazz"
        | "Mojo Productions - The Sneaky"
        | "Mojo Productions - The Sneaky Jazz";
    type LobbyLeaderboardInfo = {
        pfp: {
            sortPriority: number;
        },
        name: {
            displayName: string,
            sortPriority: number;
        }
    };
    type LobbyLeaderboardValues = {
        [key: string]: number | string;
    };
    type EarthSkyBox = {
        type: "earth"
        inclination?: number
        turbidity?: number
        infiniteDistance?: number
        luminance?: number
        yCameraOffset?: number
        azimuth?: number
        vertexTint?: [number, number, number]
    };
    type EntityName = {
        entityName: string,
        style?: {
            color?: string,
            colour?: string
        }
    };
    type StyledIcon = {
        icon: string,
        style?: {
            color?: string,
            colour?: string,
            fontSize?: string,
            opacity?: number
        }
    };
    type StyledText = {
        str: string,
        style?: {
            color?: string,
            colour?: string,
            fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "italic" | string,
            fontSize?: string,
            fontStyle?: string,
            opacity?: number,
        },
        clickableUrl?: string
    };
    type TranslatedText = {
        translationKey: string,
        params?: Record<string, string | number | boolean | EntityName>
    };
    type CustomTextStyling = (string | EntityName | TranslatedText | StyledText | StyledIcon)[];
    interface ClientOptions {
        "canChange": boolean;
        "canCraft": boolean;
        "canPickUpItems": boolean;
        "canCustomiseChar": boolean;
        "canUseZoomKey": boolean;
        "canAltAction": boolean;
        "canSeeNametagsThroughWalls": boolean;
        "canPickBlocks": boolean;
        "cantChangeError": PNull<string | CustomTextStyling>;
        "cantBreakError": PNull<string | CustomTextStyling>;
        "cantBuildError": PNull<string | CustomTextStyling>;
        "useInventory": boolean;
        "useFullInventory": boolean;
        "showPlayersInUnloadedChunks": boolean;
        "showKillfeed": boolean;
        "showBasicMovementControls": boolean;
        "numClosestPlayersVisible": PNull<number>;
        "showProgressBar": boolean;
        "speedMultiplier": number;
        "crouchingSpeed": number;
        "flySpeedMultiplier": number;
        "jumpAmount": number;
        "airJumpCount": number;
        "bunnyhopMaxMultiplier": number;
        "music": PNull<Song>;
        "musicVolumeLevel": number;
        "cameraTint": PNull<[number, number, number, number]>;
        "playerZoom": number;
        "zoomOutDistance": number;
        "maxPlayerZoom": number;
        "lobbyLeaderboardInfo": PNull<LobbyLeaderboardInfo>;
        "middleTextUpper": string | CustomTextStyling;
        "middleTextLower": string | CustomTextStyling;
        "RightInfoText": string | CustomTextStyling;
        "touchscreenActionButton": PNull<string | CustomTextStyling>;
        "iventoryItemsMoveable": boolean;
        "invincible": boolean;
        "maxShield": number;
        "initialShield": number;
        "maxHealth": number;
        "initialHealth": PNull<number>;
        "healthRegenAmount": number;
        "healthRegenInterval": number;
        "healthRegenStartAfter": number;
        "effectDamageDuration": number;
        "effectSpeedDuration": number;
        "effectDamageReductionDuration": number;
        "effectHealthRegenDuration": number;
        "potionEffectDuration": number;
        "splashPotionEffectDuration": number;
        "arrowPotionEffectDuration": number;
        "secsToRespawn": number;
        "usePlayAgainButton": boolean;
        "autoRespawn": boolean;
        "respawnButtonText": string;
        "killstreakDuration": number;
        "dealingDamageMultiplier": number;
        "dealingDamageHeadMultiplier": number;
        "dealingDamageLegMultiplier": number;
        "dealingDamageDefaultMultiplier": number;
        "receivingDamageMultiplier": number;
        "fallDamage": boolean;
        "kartTargetSpeedMult": number;
        "kartSpeedEffectMult": number;
        "kartGliderTargetHeight": number;
        "kartGroundHeight": number;
        "kartApproachMaxSpeedScalar": number;
        "airFrictionScale": number;
        "groundFrictionScale": number;
        "airAccScale": number;
        "airMomentumConservation": number;
        "canEditCode": boolean;
        "auraPerLevel": number;
        "maxAuraLevel": number;
        "chatChannel": { channelName: string; elementContent: string | CustomTextStyling; elementBgColor: string; }[];
        "droppedItemScale": number;
        "movementBasedFovScale": number;
        "creative": boolean;
        "compassTarget": string | number | number[];
        "skyBox": string | EarthSkyBox;
        "defaultBlock": string;
        "ttbMultiplier": number;
        "strictFluidBuckets": boolean;
    }
    type PassedOption = keyof ClientOptions;
    type IngameIconName = "Damage" | "Damage Reduction" | "Speed" | "VoidJump" | "Fist" | "Frozen" | "Hydrated" | "Invisible" | "Jump Boost" | "Poisoned" | "Slowness" | "Weakness" | "Health Regen" | "Haste" | "Double Jump" | "Heat Resistance" | "Gliding" | "Boating" | "Obsidian Boating" | "Riding" | "Bunny Hop" | "FallDamage" | "Feather Falling" | "Thief" | "Rested Damage" | "Rested Haste" | "Rested Speed" | "Rested Farming Yield" | "Rested Aura" | "Damage Enchantment" | "Critical Damage Enchantment" | "Attack Speed Enchantment" | "Protection Enchantment" | "Health Enchantment" | "Health Regen Enchantment" | "Stomp Damage Enchantment" | "Knockback Resist Enchantment" | "Arrow Speed Enchantment" | "Arrow Damage Enchantment" | "Quick Charge Enchantment" | "Break Speed Enchantment" | "Momentum Enchantment" | "Mining Yield Enchantment" | "Farming Yield Enchantment" | "Mining Aura Enchantment" | "Digging Aura Enchantment" | "Lumber Aura Enchantment" | "Farming Aura Enchantment" | "Vertical Knockback Enchantment" | "Horizontal Knockback Enchantment" | "Health" | "HealthShield";
    const enum WalkThroughType {
        CANT_WALK_THROUGH = 0,
        CAN_WALK_THROUGH = 1,
        DEFAULT_WALK_THROUGH = 2,
    }
    const enum ParticleSystemBlendMode {
        ALPHA = 0,
        ADD = 1,
        MULTIPLY = 2,
    }
    type SkyBoxOptions = "earth" | "interstellar" | "space_lightblue" | "space_blue" | "space_red" | "underwater";
    type NameTagInfo = {
        backgroundColor?: string,
        content?: StyledText[],
        subtitle?: StyledText[],
        subtitleBackgroundColor?: string
    };
    type EntityMeshScalingMap = { [key in "TorsoNode" | "HeadMesh" | "ArmRightMesh" | "ArmLeftMesh" | "LegLeftMesh" | "LegRightMesh"]?: number[] };
    type MeshTypes = [null, "BloxdBlock", "ParticleEmitter"];
    interface OtherEntitySettings {
        "opacity": number;
        "canAttack": boolean;
        "canSee": boolean;
        "showDamageAmounts": boolean;
        "killfeedColour": string;
        "meshScaling": EntityMeshScalingMap;
        "colorInLobbyLeaderboard": string;
        "lobbyLeaderboardValues": LobbyLeaderboardValues;
        "nameTagInfo": PNull<NameTagInfo>;
        "hasPriorityNametag": boolean;
        "nameColour": string;
    }
    type Setting = keyof OtherEntitySettings;
    type TempParticleSystemOpts = {
        "texture": string
        "minLifeTime": number
        "maxLifeTime": number
        "minEmitPower": number
        "maxEmitPower": number
        "minSize": number
        "maxSize": number
        "gravity": number[]
        "velocityGradients": {
            "timeFraction": number
            "factor": number
            "factor2": number
        }[]
        "colorGradients": {
            "timeFraction": number
            "minColor": [number, number, number, number]
            "maxColor"?: [number, number, number, number]
        }[] | {
            "color": [number, number, number]
        }[]
        "blendMode": ParticleSystemBlendMode
        "dir1": number[]
        "dir2": number[]
        "pos1": number[]
        "pos2": number[]
        "manualEmitCount": number
        "hideDist"?: number
    };
    type WorldBlockChangedInfo = {
        cause: PNull<"Paintball" | "FloorCreator" | "Sapling" | "StemFruit" | "MeltingIce" | "Explosion">
    };
    type TopRightHelperOpts = {
        duration?: number,
        width?: number,
        height?: number,
        color?: string,
        iconSizeMult?: number,
        textAndIconColor?: string,
        fontSize?: string
    };
}

export {};