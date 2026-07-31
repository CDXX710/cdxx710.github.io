import Utils from "../utils.js"

// ─────────────────────────────────────────────────────────────
// Default content shown in the visualizer dialog before any real
// source-document content has been loaded into it. Illustrative
// placeholder text only — VisualizerModal swaps this out via
// contentNodes the first time real content is provided.
// ─────────────────────────────────────────────────────────────
const visualizerPlaceholderContent = Utils.html`<article class="lorem_main">
	<header class="lorem_header__">
		<h2 class="lorem_header__h1">Lorem Ipsum</h2>
		<p class="lorem_header__h2">Illustrative data only</p>
	</header>

	<div class="lorem_header__sub">
		<p class="lorem_header__h3">"Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit..."</p>
		<p class="lorem_header__h4">"There is no one who loves pain itself, who seeks after it and wants to have it, simply because it is pain..."</p>
	</div>

	<div class="lorem_boxed">
		<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla luctus ac lorem et vulputate. In tempus, metus vitae varius mattis, nisl justo imperdiet ligula, interdum placerat justo purus laoreet nisl. Quisque vulputate mauris vel velit rutrum malesuada. Mauris ultricies ligula sit amet odio laoreet consectetur. Sed vitae augue ut odio pharetra ultrices. In hac habitasse platea dictumst. In eget mauris sit amet nibh lobortis elementum ac ut mauris. Donec risus dui, varius eu condimentum condimentum, blandit eu sem. Donec viverra quam eget eros suscipit finibus. Donec eleifend id eros in vehicula. Nulla eleifend fringilla vulputate. Etiam sagittis odio dolor, finibus euismod ante pharetra id.</p>

		<p>Etiam vitae erat sed lorem eleifend tempor at in sapien. Fusce nec neque non nunc tincidunt porttitor et quis erat. Fusce iaculis tempus nibh sit amet bibendum. Nunc volutpat, sapien a tincidunt varius, turpis purus viverra est, a hendrerit urna massa eget libero. Proin vehicula urna a dolor elementum feugiat. Donec risus massa, iaculis sed facilisis a, faucibus sit amet arcu. Mauris imperdiet a lacus et viverra.</p>

		<p>Pellentesque eget nisi varius, vestibulum nisi id, eleifend turpis. Aenean vestibulum turpis ut massa ullamcorper viverra. Morbi nec lobortis neque, a interdum odio. Nam ut est cursus, feugiat orci at, vestibulum urna. Phasellus ut elementum mi, vel elementum lacus. Donec rutrum, enim vel lobortis molestie, magna metus luctus turpis, et fringilla ante lacus sed ante. In mollis libero vitae velit lacinia, eu vestibulum enim placerat. Quisque euismod sagittis justo. Duis ultricies at sapien vel luctus. Donec ut felis ut nulla pretium mollis. Donec ultricies lorem mi, ac iaculis mauris blandit in. Etiam semper dolor a arcu ultricies maximus. Fusce at scelerisque libero. Proin consectetur odio quis lectus volutpat rutrum. Vivamus et tellus lobortis, accumsan mauris sit amet, auctor est. Sed ut ante at tellus iaculis faucibus.</p>

		<p>Sed eget mi in arcu fermentum elementum. Ut vitae metus sagittis, placerat neque suscipit, pharetra turpis. Etiam sed vulputate ipsum, sed ullamcorper velit. Cras tristique feugiat ultricies. Integer finibus rhoncus mollis. Nam vehicula vitae tortor eget tempus. Phasellus malesuada finibus vestibulum. Curabitur in ante efficitur, efficitur dui sed, ultricies ex. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Aliquam commodo maximus cursus.</p>

		<p>Phasellus elementum tellus erat, ut varius risus viverra a. Sed mi diam, vehicula sit amet fringilla sit amet, lacinia eu neque. Duis scelerisque maximus nunc, et euismod augue bibendum eget. Etiam molestie cursus magna, in semper nunc gravida a. Donec sollicitudin ut ante sit amet suscipit. Suspendisse potenti. Quisque turpis turpis, maximus nec pretium non, efficitur ut justo. Vestibulum ullamcorper ante nunc, sed viverra dui finibus id. Nam gravida sed leo sit amet rutrum. Nulla facilisi. Fusce quis nibh dignissim, euismod ante id, consequat diam. In pellentesque mauris eu odio auctor feugiat. In nec lacus interdum, scelerisque mi a, facilisis nibh. Nulla facilisi. Phasellus ut dui metus. Sed hendrerit commodo interdum.</p>
	</div>
</article>`

export default visualizerPlaceholderContent
