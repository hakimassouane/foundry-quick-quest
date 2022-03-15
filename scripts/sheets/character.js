import CharacterRollDialog from "../dialogs/character-roll.js";

export default class ActorSheetCharacter extends ActorSheet {

	/** @override */
	static get defaultOptions() {
		return mergeObject(
			super.defaultOptions,
			{
				classes: ["window-gqq"],
				height: 602,
				width: 948,
				template: 'systems/quickquest/templates/sheets/character.html',
				resizable: false,
				tabs: [{navSelector: ".tabs__nav", contentSelector: ".tabs__body", initial: "attributes"}]
			}
		);
	}

	activateListeners(html) {
		if (this.isEditable) {   
			html.find('.character__resources .item__action--add').click(this._onResourceAdd.bind(this));
			html.find('.character__perks .item__action--add').click(this._onPerkAdd.bind(this));
			html.find('.resource__action--toggle-equipped').click(this._onResourceToggleEquipped.bind(this));
			html.find('.item__action--toggle-hidden').click(this._onItemToggleHidden.bind(this));
			html.find('.item .item__icon img, .item__action--open').click(this._onItemOpen.bind(this));
			html.find('.item .item__title input, .resource .resource__bulk input, .resource .resource__value input, .resource .resource__charges input').change(this._onItemChange.bind(this));
			html.find('.item__action--delete').click(this._onItemDelete.bind(this));
			html.find('.character-action--roll, .attributes .attribute__tag').click(this._onMakeRoll.bind(this));
		}
		super.activateListeners(html);
	}

	_onResourceAdd(event) {
		event.preventDefault();
		const resourceData = {
			name: game.i18n.format("new.resource.title"),
			img: "icons/svg/item-bag.svg",
			type: "resource",
			data: duplicate(event.currentTarget.dataset)
		};
		delete resourceData.data["type"];

		const toReturn = this.actor.createEmbeddedDocuments("Item", [resourceData]);
		return toReturn
	}

	_onPerkAdd(event) {
		event.preventDefault();
		const resourceData = {
			name: game.i18n.format("new.perk.title"),
			img: "icons/svg/aura.svg",
			type: "perk",
			data: duplicate(event.currentTarget.dataset)
		};
		delete resourceData.data["type"];
		return this.actor.createEmbeddedDocuments("Item", [resourceData]);
	}

	_onResourceToggleEquipped(event) {
		event.preventDefault();
		const li = event.currentTarget.closest(".resource");
		const resource = this.actor.getEmbeddedDocument("Item", li.dataset.itemId);
		resource.update({
			"data.isEquipped": !resource.data.data.isEquipped
		});
	}

	_onItemToggleHidden(event) {
		event.preventDefault();
		const li = event.currentTarget.closest(".item");
		const item = this.actor.getEmbeddedDocument("Item", li.dataset.itemId);
		item.update({
			"data.isHidden": !item.data.data.isHidden
		});
	}

	_onItemChange(event) {
		event.preventDefault();
		const field = event.currentTarget.getAttribute("data-field");
		const value = event.currentTarget.value;
		const li = event.currentTarget.closest(".item");
		const item = this.actor.getEmbeddedDocument("Item", li.dataset.itemId);
		item.update({
			[field]: value
		});
	}

	_onItemOpen(event) {
		event.preventDefault();
		const li = event.currentTarget.closest(".item");
		const item = this.actor.getEmbeddedDocument("Item", li.dataset.itemId);
		item.sheet.render(true);
	}

	_onItemDelete(event) {
		event.preventDefault();
		const li = event.currentTarget.closest(".item");
		this.actor.deleteEmbeddedDocuments("Item", [li.dataset.itemId]);
	}

	async _onMakeRoll(event) {
		event.preventDefault();
		let preselectedAttribute = event.currentTarget.closest(".attribute") ? event.currentTarget.closest(".attribute").getAttribute("data-attribute") : null;
		try {
			let form = await CharacterRollDialog.characterRollDialog({preselectedAttribute: preselectedAttribute});
			let rollParts = [];
			let messageParts = {
				attribute: null,
				archetype: null,
				advantage: null
			};
			if (form.attribute) {
				rollParts.push(this.actor.data.data.attributes[form.attribute].total);
				messageParts.attribute = game.i18n.format(`common.${form.attribute}.name`);
			}
			if (form.archetype) {
				rollParts.push(this.actor.data.data.archetypes[form.archetype].total);
				messageParts.archetype = game.i18n.format(`common.${form.archetype}.name`);
			}
			if (form.bonus) {
				rollParts.push(form.bonus);
			}
			switch (form.advantage) {
				case "advantage":
					rollParts.unshift("2d20kh");
					messageParts.advantage = game.i18n.format('common.advantage');
					break;
				case "disadvantage":
					rollParts.unshift("2d20kl");
					messageParts.advantage = game.i18n.format('common.disadvantage');
					break;
				default: 
					rollParts.unshift("1d20");
					break;
			}
			const roll = await new Roll(rollParts.join(" + ")).roll();
			console.log(roll)

			let contentDices = []

			for(let i = 0; i < roll.dice[0].number; i++) {
				if (i === 0) contentDices.push(`<ol class="dice-rolls">`)
				contentDices.push(`<li class="roll die d20 ${roll.dice[0].results[i].discarded ? "discarded" : ""}">${roll.dice[0].results[i].result}</li>`)
			}
			contentDices.push(`</ol>`)

			console.log(contentDices)

			ChatMessage.create({
				type: CONST.CHAT_MESSAGE_TYPES.ROLL,
				content: `
					<div class="dice-roll">
						<div class="dice-result">
						<div class="dice-formula">${roll.formula}</div>
							<div class="dice-tooltip">
								<section class="tooltip-part">
									<div class="dice">
										<header class="part-header flexrow">
											<span class="part-formula">${roll.formula.substring(0, roll.formula.indexOf("20") + 2)}</span>
											
											<span class="part-total">${roll.total}</span>
										</header>
										${contentDices.join("")}
									</div>
								</section>
							</div>
						<h4 class="dice-total">${roll.total}</h4>
						
					</div>
				</div>
				`,
				rollMode: form.mode,
				roll
			});

			/* ChatMessage.create({
				type: CONST.CHAT_MESSAGE_TYPES.ROLL,
				content: `
				<div class="dnd5e chat-card item-card" data-actor-id="${this.actor.id}" data-item-id="{{item.id}}">
					<p class="item-name" style="font-family: 'Signika';">${`Jet de
						${form.attribute ? game.i18n.format(`common.${form.attribute}.name`) : ""}
						${form.archetype ? game.i18n.format(`common.${form.archetype}.name`) : ""}
					`}
					</p>

				<div class="card-buttons">
					<button style="font-family: 'Signika'; font-size: 1rem;">${roll.formula}</button>
					<button style="font-family: 'Signika'; font-size: 1rem; font-weight: bold;">${roll.total}</button>
				</div>
			</div>
				`,
				rollMode: form.mode,
				roll
			}); */
		} catch(err) {
			console.log(err);
			return;
		}
	}

	static _getMessageFromParts(messageParts) {
		let type = (messageParts.attribute && messageParts.archetype) ? "dual" : (messageParts.attribute ? "attribute" : "archetype");
		let advantage = messageParts.advantage ? "advantage" : "normal";
		return game.i18n.format(`chat.roll.${type}.${advantage}`, messageParts);
	}
}
