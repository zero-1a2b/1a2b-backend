export enum RoomState {
    IDLE,
    GAMING,
    FINISHED
}


export class Room {

    readonly state: RoomState

    readonly playerIDs: string[]

    readonly playerReady: Map<string, boolean>

}

export class ClientRoom {


}

export class ServerRoom {

}