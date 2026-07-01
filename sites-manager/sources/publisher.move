module sites_manager::publisher {
    use std::string::{Self, String};
    use sui::object::{Self, UID};
    use sui::tx_context::{TxContext};

    /// Our custom Publisher capability for Walrus Sites
    struct Publisher has key, store {
        id: UID,
    }

    /// Create a Publisher — only callable once
    fun init(ctx: &mut TxContext) {
        transfer::transfer(
            Publisher { id: object::new(ctx) },
            tx_context::sender(ctx)
        );
    }

    /// Get the Publisher ID (for downstream use)
    public fun publisher_id(p: &Publisher): address {
        object::uid_to_address(&p.id)
    }
}
