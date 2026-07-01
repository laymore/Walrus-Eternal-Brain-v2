module sites_manager::site_factory {
    use 0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27::site;
    use 0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27::metadata;
    use std::string::String;
    use std::option::{Self, Option};
    use sui::transfer;

    public entry fun create_site(ctx: &mut sui::tx_context::TxContext) {
        let meta = metadata::new_metadata(
            option::none(), // link
            option::none(), // image_url
            option::none(), // description
            option::none(), // project_url
            option::none(), // creator
        );
        let s = site::new_site(b"Walrus Forum".to_string(), meta, ctx);
        transfer::public_transfer(s, tx_context::sender(ctx));
    }
}
